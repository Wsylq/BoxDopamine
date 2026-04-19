#!/usr/bin/env python3
"""
Dopamine Box Multiplayer Server
WebSocket relay server for real-time multiplayer games
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Set
import websockets
from websockets.server import WebSocketServerProtocol

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

# Store rooms and connections
rooms: Dict[str, Set[WebSocketServerProtocol]] = {}
user_data: Dict[WebSocketServerProtocol, dict] = {}

async def handle_client(websocket: WebSocketServerProtocol, path: str):
    """Handle individual client connections"""
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
                
    except websockets.exceptions.ConnectionClosed:
        logger.info(f"Connection closed: {client_id}")
    finally:
        await cleanup_client(websocket)

async def process_message(websocket: WebSocketServerProtocol, data: dict):
    """Process incoming messages"""
    msg_type = data.get('type')
    
    if msg_type == 'join_room':
        await handle_join_room(websocket, data)
    elif msg_type == 'leave_room':
        await handle_leave_room(websocket, data)
    else:
        # Relay message to room
        await relay_message(websocket, data)

async def handle_join_room(websocket: WebSocketServerProtocol, data: dict):
    """Handle room join requests"""
    room_id = data.get('roomId')
    user_id = data.get('userId')
    username = data.get('username', 'Anonymous')
    is_host = data.get('isHost', False)
    
    if not room_id or not user_id:
        await websocket.send(json.dumps({"error": "Missing roomId or userId"}))
        return
    
    # Store user data
    user_data[websocket] = {
        'roomId': room_id,
        'userId': user_id,
        'username': username,
        'isHost': is_host,
        'joinedAt': datetime.now().isoformat()
    }
    
    # Create room if doesn't exist
    if room_id not in rooms:
        rooms[room_id] = set()
        logger.info(f"Created room: {room_id}")
    
    # Add to room
    rooms[room_id].add(websocket)
    
    # Confirm join
    await websocket.send(json.dumps({
        "type": "joined",
        "roomId": room_id,
        "userId": user_id
    }))
    
    # Notify others in room
    await broadcast_to_room(room_id, {
        "type": "player_joined",
        "userId": user_id,
        "username": username,
        "isHost": is_host
    }, exclude=websocket)
    
    logger.info(f"User {username} ({user_id}) joined room {room_id} (host: {is_host})")
    logger.info(f"Room {room_id} now has {len(rooms[room_id])} players")

async def handle_leave_room(websocket: WebSocketServerProtocol, data: dict):
    """Handle room leave requests"""
    await cleanup_client(websocket)

async def relay_message(websocket: WebSocketServerProtocol, data: dict):
    """Relay message to all clients in the same room"""
    room_id = data.get('roomId')
    
    if not room_id or room_id not in rooms:
        return
    
    # Broadcast to all in room except sender
    await broadcast_to_room(room_id, data, exclude=websocket)

async def broadcast_to_room(room_id: str, message: dict, exclude: WebSocketServerProtocol = None):
    """Send message to all clients in a room"""
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
    
    # Clean up disconnected clients
    for client in disconnected:
        rooms[room_id].discard(client)
        if client in user_data:
            del user_data[client]

async def cleanup_client(websocket: WebSocketServerProtocol):
    """Clean up when client disconnects"""
    if websocket not in user_data:
        return
    
    user_info = user_data[websocket]
    room_id = user_info.get('roomId')
    user_id = user_info.get('userId')
    username = user_info.get('username')
    
    # Remove from room
    if room_id and room_id in rooms:
        rooms[room_id].discard(websocket)
        
        # Notify others
        await broadcast_to_room(room_id, {
            "type": "player_left",
            "userId": user_id,
            "username": username
        })
        
        # Delete empty rooms
        if len(rooms[room_id]) == 0:
            del rooms[room_id]
            logger.info(f"Deleted empty room: {room_id}")
        else:
            logger.info(f"Room {room_id} now has {len(rooms[room_id])} players")
    
    # Remove user data
    del user_data[websocket]
    logger.info(f"User {username} ({user_id}) left room {room_id}")

async def main():
    """Start the WebSocket server"""
    host = "0.0.0.0"
    port = 5038
    
    logger.info(f"Starting Dopamine Box Multiplayer Server on {host}:{port}")
    
    async with websockets.serve(handle_client, host, port):
        logger.info("Server is running! Press Ctrl+C to stop.")
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
