#!/usr/bin/env python3
"""
Test script for the multiplayer server
Run this to verify the server is working correctly
"""

import asyncio
import json
import websockets

async def test_connection():
    """Test basic connection and room joining"""
    uri = "ws://localhost:5038"
    
    print(f"Connecting to {uri}...")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Connected!")
            
            # Join a test room
            join_msg = {
                "type": "join_room",
                "roomId": "TEST123",
                "userId": "test_user_1",
                "username": "TestPlayer",
                "isHost": True
            }
            
            await websocket.send(json.dumps(join_msg))
            print(f"Sent: {join_msg}")
            
            # Wait for response
            response = await websocket.recv()
            data = json.loads(response)
            print(f"Received: {data}")
            
            if data.get("type") == "joined":
                print("✅ Successfully joined room!")
            else:
                print("❌ Unexpected response")
            
            # Send a test message
            test_msg = {
                "roomId": "TEST123",
                "fromId": "test_user_1",
                "message": {
                    "type": "chat",
                    "username": "TestPlayer",
                    "msg": "Hello from test!"
                }
            }
            
            await websocket.send(json.dumps(test_msg))
            print(f"Sent test message: {test_msg}")
            
            print("\n✅ All tests passed!")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("Multiplayer Server Test")
    print("=" * 50)
    asyncio.run(test_connection())
