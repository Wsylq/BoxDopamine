// ═══════════════════════════════════════════════════════════
// Simple Relay Service (WebSocket message relay)
// ═══════════════════════════════════════════════════════════

type MessageHandler = (data: any, fromId: string) => void;

class RelayService {
  private ws: WebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private reconnectTimer: number | null = null;
  public myId = '';
  public username = '';
  private roomId = '';
  private isHost = false;

  // Initialize username
  initUsername() {
    let username = localStorage.getItem('relay_username');
    if (!username) {
      username = prompt('Choose a username (cannot be changed later):') || `Player${Math.floor(Math.random() * 9999)}`;
      localStorage.setItem('relay_username', username);
    }
    this.username = username;
    return username;
  }

  getUsername() {
    return this.username || this.initUsername();
  }

  // Connect to relay server
  connect(isHost: boolean, roomId?: string) {
    this.isHost = isHost;
    this.roomId = roomId || this.generateRoomId();
    this.getUsername();

    // Use the configured WebSocket server
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://node05.host2play.gratis:5038';
    console.log('Connecting to:', wsUrl);
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('✅ Connected to relay server');
      this.myId = `${this.username}_${Date.now().toString(36).slice(-4)}`;
      
      // Join room
      this.ws!.send(JSON.stringify({
        type: 'join_room',
        roomId: this.roomId,
        userId: this.myId,
        username: this.username,
        isHost: this.isHost
      }));
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received message:', data);
        
        // Handle server messages
        if (data.type === 'joined') {
          console.log('✅ Joined room successfully');
          return;
        }
        
        if (data.type === 'player_joined' || data.type === 'player_left') {
          this.handlers.forEach(handler => handler(data, data.userId));
          return;
        }
        
        // Handle relayed messages from other players
        if (data.roomId === this.roomId && data.fromId !== this.myId) {
          this.handlers.forEach(handler => handler(data.message, data.fromId));
        }
      } catch (error) {
        console.error('Message parse error:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('❌ Disconnected from relay');
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('Relay error:', error);
    };

    return this.roomId;
  }

  private generateRoomId() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      if (this.roomId) {
        this.connect(this.isHost, this.roomId);
      }
    }, 3000);
  }

  // Send message to room
  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        roomId: this.roomId,
        fromId: this.myId,
        message
      }));
    }
  }

  // Subscribe to messages
  subscribe(handler: MessageHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  // Get room ID
  getRoomId() {
    return this.roomId;
  }

  // Disconnect
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const relayService = new RelayService();