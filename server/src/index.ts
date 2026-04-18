import { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 3001;

// Room management
const rooms = new Map<string, Set<any>>();

const wss = new WebSocketServer({ 
  port: PORT as number,
  perMessageDeflate: false
});

console.log(`🎮 Dopamine Box Server running on port ${PORT}`);

wss.on('connection', (ws) => {
  let currentRoom: string | null = null;
  let userId: string | null = null;

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      if (message.type === 'join_room') {
        // Join room
        currentRoom = message.roomId;
        userId = message.userId;
        
        if (!rooms.has(currentRoom)) {
          rooms.set(currentRoom, new Set());
        }
        
        const room = rooms.get(currentRoom)!;
        room.add(ws);
        
        console.log(`Player ${userId} joined room ${currentRoom} (${room.size} players)`);
        
        // Notify others in room
        room.forEach(client => {
          if (client !== ws && client.readyState === 1) {
            client.send(JSON.stringify({
              type: 'player_joined',
              userId: message.userId,
              username: message.username,
              isHost: message.isHost
            }));
          }
        });
        
        // Send confirmation to joiner
        ws.send(JSON.stringify({
          type: 'joined',
          roomId: currentRoom,
          playerCount: room.size
        }));
        
      } else if (message.roomId && currentRoom === message.roomId) {
        // Relay message to room
        const room = rooms.get(currentRoom);
        if (room) {
          room.forEach(client => {
            if (client !== ws && client.readyState === 1) {
              client.send(JSON.stringify(message));
            }
          });
        }
      }
    } catch (error) {
      console.error('Message error:', error);
    }
  });

  ws.on('close', () => {
    if (currentRoom && userId) {
      const room = rooms.get(currentRoom);
      if (room) {
        room.delete(ws);
        console.log(`Player ${userId} left room ${currentRoom} (${room.size} players)`);
        
        // Notify others
        room.forEach(client => {
          if (client.readyState === 1) {
            client.send(JSON.stringify({
              type: 'player_left',
              userId
            }));
          }
        });
        
        // Clean up empty rooms
        if (room.size === 0) {
          rooms.delete(currentRoom);
        }
      }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});