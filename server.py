#!/usr/bin/env python3
"""
Dopamine Box Multiplayer Server — FIXED VERSION
Fixes:
  1. wss:// support via ssl (or run behind nginx with SSL termination)
  2. Proper CORS / ping-pong keepalive
  3. 'joined' confirmation forwarded cleanly
"""

import asyncio
import json
import logging
import ssl
import os
from datetime import datetime
from typing import Dict, Set
import websockets
from websockets.server import WebSocketServerProtocol

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

rooms: Dict[str, Set[WebSocketServerProtocol]] = {}
user_data: Dict[WebSocketServerProtocol, dict] = {}


async def handle_client(websocket: WebSocketServerProtocol, path: str = "/"):
    client_id = f"{websocket.remote_address[0]}:{websocket.remote_address[1]}"
    logger.info(f"New connection: {client_id}")
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                await process_message(websocket, data)
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON from {client_id}")
                await websocket.send(json.dumps({"error": "Invalid JSON"}))
            except Exception as e:
                logger.error(f"Error processing message: {e}")
    except websockets.exceptions.ConnectionClosed as e:
        logger.info(f"Connection closed: {client_id} — {e.code} {e.reason}")
    finally:
        await cleanup_client(websocket)


async def process_message(websocket: WebSocketServerProtocol, data: dict):
    msg_type = data.get('type')
    if msg_type == 'join_room':
        await handle_join_room(websocket, data)
    elif msg_type == 'leave_room':
        await handle_leave_room(websocket, data)
    elif msg_type == 'ping':
        await websocket.send(json.dumps({"type": "pong"}))
    else:
        await relay_message(websocket, data)


async def handle_join_room(websocket: WebSocketServerProtocol, data: dict):
    room_id = data.get('roomId')
    user_id = data.get('userId')
    username = data.get('username', 'Anonymous')
    is_host = data.get('isHost', False)

    if not room_id or not user_id:
        await websocket.send(json.dumps({"error": "Missing roomId or userId"}))
        return

    if room_id not in rooms:
        rooms[room_id] = set()
        logger.info(f"Created room: {room_id}")

    # ── Deduplicate: kick old connection with same username ──
    stale = [
        ws for ws, info in user_data.items()
        if info.get('roomId') == room_id and info.get('username') == username and ws != websocket
    ]
    for old_ws in stale:
        logger.info(f"♻️  Replacing stale connection for {username} in room {room_id}")
        rooms[room_id].discard(old_ws)
        del user_data[old_ws]
        try:
            await old_ws.close(1000, "Replaced by new connection")
        except Exception:
            pass

    user_data[websocket] = {
        'roomId': room_id,
        'userId': user_id,
        'username': username,
        'isHost': is_host,
        'joinedAt': datetime.now().isoformat()
    }

    rooms[room_id].add(websocket)

    # ✅ FIX: Send 'joined' confirmation WITH full info the client needs
    await websocket.send(json.dumps({
        "type": "joined",
        "roomId": room_id,
        "userId": user_id,
        "username": username,
        "isHost": is_host,
        "playerCount": len(rooms[room_id])
    }))

    # Notify everyone else in room — use 'player_rejoined' if they were already in the game
    was_reconnect = len(stale) > 0
    await broadcast_to_room(room_id, {
        "type": "player_joined",
        "userId": user_id,
        "username": username,
        "isHost": is_host,
        "playerCount": len(rooms[room_id]),
        "isReconnect": was_reconnect,
    }, exclude=websocket)

    logger.info(f"User {username} ({user_id}) {'rejoined' if was_reconnect else 'joined'} room {room_id} — {len(rooms[room_id])} players")


async def handle_leave_room(websocket: WebSocketServerProtocol, data: dict):
    await cleanup_client(websocket)


async def relay_message(websocket: WebSocketServerProtocol, data: dict):
    room_id = data.get('roomId')
    if not room_id or room_id not in rooms:
        logger.warning(f"Relay failed: room {room_id} not found")
        return
    
    msg = data.get('message', {})
    msg_type = msg.get('type', 'unknown') if isinstance(msg, dict) else 'unknown'
    from_id = data.get('fromId', 'unknown')
    
    logger.info(f"📤 Relaying '{msg_type}' from {from_id} in room {room_id} to {len(rooms[room_id]) - 1} other(s)")
    logger.debug(f"Message content: {msg}")
    
    await broadcast_to_room(room_id, data, exclude=websocket)


async def broadcast_to_room(room_id: str, message: dict, exclude: WebSocketServerProtocol = None):
    if room_id not in rooms:
        return
    disconnected = set()
    for client in rooms[room_id]:
        if client == exclude:
            continue
        try:
            await client.send(json.dumps(message))
        except websockets.exceptions.ConnectionClosed:
            disconnected.add(client)
    for client in disconnected:
        rooms[room_id].discard(client)
        if client in user_data:
            del user_data[client]


async def cleanup_client(websocket: WebSocketServerProtocol):
    if websocket not in user_data:
        return
    user_info = user_data[websocket]
    room_id = user_info.get('roomId')
    user_id = user_info.get('userId')
    username = user_info.get('username')

    if room_id and room_id in rooms:
        rooms[room_id].discard(websocket)
        await broadcast_to_room(room_id, {
            "type": "player_left",
            "userId": user_id,
            "username": username,
            "playerCount": len(rooms[room_id])
        })
        if len(rooms[room_id]) == 0:
            del rooms[room_id]
            logger.info(f"Deleted empty room: {room_id}")

    del user_data[websocket]
    logger.info(f"User {username} ({user_id}) left room {room_id}")


async def main():
    host = "0.0.0.0"
    port = int(os.environ.get("PORT", 5038))

    # ── SSL / WSS setup ──────────────────────────────────────────────
    # OPTION A: You have a cert (recommended for production)
    #   Set environment variables:
    #     SSL_CERT=/path/to/fullchain.pem
    #     SSL_KEY=/path/to/privkey.pem
    #   Then the server will use wss:// automatically.
    #
    # OPTION B: No cert — run BEHIND nginx as a reverse proxy with SSL.
    #   See nginx config in the README / instructions tab.
    #
    # OPTION C (quick test only, NOT for cross-city): plain ws://
    #   Just don't set SSL_CERT / SSL_KEY.
    # ────────────────────────────────────────────────────────────────
    ssl_context = None
    cert_path = os.environ.get("SSL_CERT")
    key_path = os.environ.get("SSL_KEY")
    if cert_path and key_path and os.path.exists(cert_path) and os.path.exists(key_path):
        ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ssl_context.load_cert_chain(cert_path, key_path)
        logger.info("🔒 SSL enabled — server will use wss://")
    else:
        logger.warning("⚠️  No SSL cert found — running plain ws:// (friends in other cities WILL fail if page is HTTPS)")

    protocol = "wss" if ssl_context else "ws"
    logger.info(f"Starting server on {protocol}://{host}:{port}")

    async with websockets.serve(
        handle_client,
        host,
        port,
        ssl=ssl_context,
        ping_interval=20,       # keepalive ping every 20s
        ping_timeout=60,        # disconnect if no pong within 60s
        max_size=2**20,         # 1 MB max message
        close_timeout=10,
    ):
        logger.info(f"✅ Server running! Connect at {protocol}://YOUR_DOMAIN:{port}")
        await asyncio.Future()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server stopped.")
