#!/usr/bin/env python3
"""
Dopamine Box — Single-port WebSocket server
Auth (register/login) + relay all on port 5038.
Auth messages are handled directly; game messages are relayed.
"""

import asyncio, json, logging, ssl, os, hashlib, hmac, base64, time, re
from typing import Dict, Set
import websockets
from websockets.server import WebSocketServerProtocol

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# ── User storage ──────────────────────────────────────────────────────────────
USERS_FILE = os.environ.get('USERS_FILE', 'users.json')
JWT_SECRET  = os.environ.get('JWT_SECRET',  'dopamine-box-secret-change-in-prod')

def load_users() -> dict:
    try:
        if os.path.exists(USERS_FILE):
            with open(USERS_FILE) as f:
                return json.load(f)
    except Exception:
        pass
    return {}

def save_users(users: dict):
    try:
        with open(USERS_FILE, 'w') as f:
            json.dump(users, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to save users: {e}")

users_db: dict = load_users()

# ── Balance helpers ───────────────────────────────────────────────────────────
def get_balance(username: str) -> int:
    key = username.lower()
    user = users_db.get(key, {})
    return user.get('balance', 1000)

def set_balance(username: str, balance: int):
    key = username.lower()
    if key in users_db:
        users_db[key]['balance'] = max(0, balance)
        save_users(users_db)

def verify_token(token: str) -> str | None:
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        header, payload, sig = parts
        sig_in   = f"{header}.{payload}".encode()
        expected = base64.urlsafe_b64encode(
            hmac.new(JWT_SECRET.encode(), sig_in, hashlib.sha256).digest()
        ).decode().rstrip('=')
        if not hmac.compare_digest(sig, expected):
            return None
        data = json.loads(base64.urlsafe_b64decode(payload + '=='))
        return data.get('sub')
    except Exception:
        return None

# ── Crypto helpers ────────────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100_000)
    return base64.b64encode(salt + dk).decode()

def verify_password(password: str, stored: str) -> bool:
    try:
        raw = base64.b64decode(stored.encode())
        salt, dk = raw[:16], raw[16:]
        check = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100_000)
        return hmac.compare_digest(dk, check)
    except Exception:
        return False

def make_token(username: str) -> str:
    header  = base64.urlsafe_b64encode(json.dumps({'alg':'HS256','typ':'JWT'}).encode()).decode().rstrip('=')
    payload = base64.urlsafe_b64encode(json.dumps({'sub': username, 'iat': int(time.time())}).encode()).decode().rstrip('=')
    sig_in  = f"{header}.{payload}".encode()
    sig     = base64.urlsafe_b64encode(hmac.new(JWT_SECRET.encode(), sig_in, hashlib.sha256).digest()).decode().rstrip('=')
    return f"{header}.{payload}.{sig}"

# ── Auth handlers (over WebSocket) ───────────────────────────────────────────
async def ws_register(websocket: WebSocketServerProtocol, data: dict):
    username = (data.get('username') or '').strip()
    password =  data.get('password') or ''

    if not username or len(username) < 3 or len(username) > 20:
        await websocket.send(json.dumps({'type':'auth_error','error':'Username must be 3–20 characters'}))
        return
    if not re.match(r'^[a-zA-Z0-9_-]+$', username):
        await websocket.send(json.dumps({'type':'auth_error','error':'Username: letters, numbers, _ and - only'}))
        return
    if len(password) < 6:
        await websocket.send(json.dumps({'type':'auth_error','error':'Password must be at least 6 characters'}))
        return

    key = username.lower()
    if key in users_db:
        await websocket.send(json.dumps({'type':'auth_error','error':'Username already taken'}))
        return

    users_db[key] = {'username': username, 'password_hash': hash_password(password), 'balance': 1000}
    save_users(users_db)
    token = make_token(username)
    logger.info(f"✅ Registered: {username}")
    await websocket.send(json.dumps({'type':'auth_ok','username': username,'token': token,'balance': 1000}))

async def ws_login(websocket: WebSocketServerProtocol, data: dict):
    username = (data.get('username') or '').strip()
    password =  data.get('password') or ''

    key  = username.lower()
    user = users_db.get(key)
    if not user or not verify_password(password, user['password_hash']):
        await websocket.send(json.dumps({'type':'auth_error','error':'Invalid username or password'}))
        return

    token = make_token(user['username'])
    logger.info(f"✅ Login: {user['username']}")
    await websocket.send(json.dumps({
        'type': 'auth_ok',
        'username': user['username'],
        'token': token,
        'balance': get_balance(user['username']),
    }))

# Max win per single game — prevents impossible payouts
MAX_WIN = 500_000
MAX_BET = 100_000

async def ws_game_result(websocket: WebSocketServerProtocol, data: dict):
    """
    Client sends: { type:'game_result', token, delta, gameId }
    delta > 0 = win (payout), delta < 0 = loss (bet deducted)
    Server validates token, clamps delta, updates balance.
    """
    token   = data.get('token') or ''
    delta   = data.get('delta', 0)
    game_id = data.get('gameId', 'unknown')

    username = verify_token(token)
    if not username:
        await websocket.send(json.dumps({'type':'balance_error','error':'Invalid token'}))
        return

    # Validate delta bounds
    try:
        delta = int(delta)
    except (TypeError, ValueError):
        await websocket.send(json.dumps({'type':'balance_error','error':'Invalid delta'}))
        return

    if delta > MAX_WIN:
        logger.warning(f"⚠️  Clamping win {delta} → {MAX_WIN} for {username}")
        delta = MAX_WIN
    if delta < -MAX_BET:
        logger.warning(f"⚠️  Clamping loss {delta} → {-MAX_BET} for {username}")
        delta = -MAX_BET

    old_balance = get_balance(username)
    new_balance = max(0, old_balance + delta)
    set_balance(username, new_balance)

    logger.info(f"💰 {username} {'+' if delta >= 0 else ''}{delta} ({game_id}) → ${new_balance}")
    await websocket.send(json.dumps({
        'type': 'balance_update',
        'balance': new_balance,
        'delta': delta,
        'gameId': game_id,
    }))

# ── Relay state ───────────────────────────────────────────────────────────────
rooms:     Dict[str, Set[WebSocketServerProtocol]] = {}
user_data: Dict[WebSocketServerProtocol, dict]     = {}

# ── Message router ────────────────────────────────────────────────────────────
async def process_message(websocket: WebSocketServerProtocol, data: dict):
    msg_type = data.get('type')

    # Auth — handled directly, no room needed
    if msg_type == 'auth_register':
        await ws_register(websocket, data)
        return
    if msg_type == 'auth_login':
        await ws_login(websocket, data)
        return
    if msg_type == 'game_result':
        await ws_game_result(websocket, data)
        return
    if msg_type == 'balance_fetch':
        token = data.get('token') or ''
        username = verify_token(token)
        if username:
            await websocket.send(json.dumps({
                'type': 'balance_ok',
                'balance': get_balance(username),
            }))
        else:
            await websocket.send(json.dumps({'type': 'balance_error', 'error': 'Invalid token'}))
        return

    if msg_type == 'join_room':
        await handle_join_room(websocket, data)
    elif msg_type == 'leave_room':
        await cleanup_client(websocket)
    elif msg_type == 'ping':
        await websocket.send(json.dumps({'type': 'pong'}))
    else:
        await relay_message(websocket, data)

# ── Room management ───────────────────────────────────────────────────────────
async def handle_join_room(websocket: WebSocketServerProtocol, data: dict):
    room_id  = data.get('roomId')
    user_id  = data.get('userId')
    username = data.get('username', 'Anonymous')
    is_host  = data.get('isHost', False)

    if not room_id or not user_id:
        await websocket.send(json.dumps({'error': 'Missing roomId or userId'}))
        return

    if room_id not in rooms:
        rooms[room_id] = set()

    # Deduplicate: kick stale connection with same username in same room
    stale = [
        ws for ws, info in user_data.items()
        if info.get('roomId') == room_id and info.get('username') == username and ws != websocket
    ]
    for old_ws in stale:
        logger.info(f"♻️  Replacing stale connection for {username} in {room_id}")
        rooms[room_id].discard(old_ws)
        del user_data[old_ws]
        try:
            await old_ws.close(1000, "Replaced by new connection")
        except Exception:
            pass

    user_data[websocket] = {
        'roomId': room_id, 'userId': user_id,
        'username': username, 'isHost': is_host,
        'joinedAt': str(__import__('datetime').datetime.now()),
    }
    rooms[room_id].add(websocket)

    await websocket.send(json.dumps({
        'type': 'joined', 'roomId': room_id,
        'userId': user_id, 'username': username,
        'isHost': is_host, 'playerCount': len(rooms[room_id]),
    }))

    was_reconnect = len(stale) > 0
    await broadcast_to_room(room_id, {
        'type': 'player_joined', 'userId': user_id,
        'username': username, 'isHost': is_host,
        'playerCount': len(rooms[room_id]),
        'isReconnect': was_reconnect,
    }, exclude=websocket)

    logger.info(f"{'Rejoined' if was_reconnect else 'Joined'}: {username} → room {room_id} ({len(rooms[room_id])} players)")

async def relay_message(websocket: WebSocketServerProtocol, data: dict):
    room_id = data.get('roomId')
    if not room_id or room_id not in rooms:
        logger.warning(f"Relay failed: room '{room_id}' not found")
        return
    msg      = data.get('message', {})
    msg_type = msg.get('type', '?') if isinstance(msg, dict) else '?'
    from_id  = data.get('fromId', '?')
    logger.info(f"📤 Relay '{msg_type}' from {from_id} in {room_id} → {len(rooms[room_id])-1} peer(s)")
    await broadcast_to_room(room_id, data, exclude=websocket)

async def broadcast_to_room(room_id: str, message: dict, exclude: WebSocketServerProtocol = None):
    if room_id not in rooms:
        return
    dead = set()
    for client in rooms[room_id]:
        if client == exclude:
            continue
        try:
            await client.send(json.dumps(message))
        except websockets.exceptions.ConnectionClosed:
            dead.add(client)
    for client in dead:
        rooms[room_id].discard(client)
        user_data.pop(client, None)

async def cleanup_client(websocket: WebSocketServerProtocol):
    if websocket not in user_data:
        return
    info     = user_data.pop(websocket)
    room_id  = info.get('roomId')
    user_id  = info.get('userId')
    username = info.get('username')
    if room_id and room_id in rooms:
        rooms[room_id].discard(websocket)
        await broadcast_to_room(room_id, {
            'type': 'player_left', 'userId': user_id,
            'username': username, 'playerCount': len(rooms[room_id]),
        })
        if not rooms[room_id]:
            del rooms[room_id]
            logger.info(f"Deleted empty room: {room_id}")
    logger.info(f"Left: {username} ({user_id}) from {room_id}")

# ── WebSocket handler ─────────────────────────────────────────────────────────
async def handle_client(websocket: WebSocketServerProtocol, path: str = "/"):
    addr = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}"
    logger.info(f"New connection: {addr}")
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                await process_message(websocket, data)
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON from {addr}")
            except Exception as e:
                logger.error(f"Error processing message: {e}")
    except websockets.exceptions.ConnectionClosed as e:
        logger.info(f"Disconnected: {addr} — {e.code}")
    finally:
        await cleanup_client(websocket)

# ── Entry point ───────────────────────────────────────────────────────────────
async def main():
    host = "0.0.0.0"
    port = int(os.environ.get("PORT", 5038))

    ssl_context = None
    cert_path = os.environ.get("SSL_CERT")
    key_path  = os.environ.get("SSL_KEY")
    if cert_path and key_path and os.path.exists(cert_path) and os.path.exists(key_path):
        ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ssl_context.load_cert_chain(cert_path, key_path)
        logger.info("🔒 SSL enabled (wss://)")
    else:
        logger.warning("⚠️  No SSL cert — plain ws://")

    protocol = "wss" if ssl_context else "ws"
    logger.info(f"Starting on {protocol}://{host}:{port}")

    async with websockets.serve(
        handle_client, host, port,
        ssl=ssl_context,
        ping_interval=20,
        ping_timeout=60,
        max_size=2**20,
        close_timeout=10,
    ):
        logger.info(f"✅ Server ready on port {port} (auth + relay)")
        await asyncio.Future()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server stopped.")
