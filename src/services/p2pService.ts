// ═══════════════════════════════════════════════════════════
// P2P Multiplayer Service (WebRTC)
// ═══════════════════════════════════════════════════════════

import Peer, { DataConnection } from 'peerjs';

type MessageHandler = (data: any, peerId: string) => void;
type ConnectionHandler = () => void;

class P2PService {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private handlers: Set<MessageHandler> = new Set();
  private connectionHandlers: Set<ConnectionHandler> = new Set();
  private isHost = false;
  public myId = '';
  public username = '';

  // Initialize username
  initUsername() {
    let username = localStorage.getItem('p2p_username');
    if (!username) {
      username = prompt('Choose a username (cannot be changed later):') || `Player${Math.floor(Math.random() * 9999)}`;
      localStorage.setItem('p2p_username', username);
    }
    this.username = username;
    return username;
  }

  getUsername() {
    return this.username || this.initUsername();
  }

  // Initialize as host or player
  init(isHost: boolean, hostId?: string) {
    this.isHost = isHost;
    this.getUsername(); // Ensure username is set
    
    // Create peer with short custom ID for host
    const peerId = isHost ? `H${Date.now().toString(36).slice(-6)}` : undefined;
    
    this.peer = new Peer(peerId, {
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' },
          // Add TURN server for better connectivity
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          }
        ]
      },
      debug: 2 // Enable debug logs
    });

    this.peer.on('open', (id) => {
      this.myId = id;
      console.log('✅ P2P connected:', id);
      
      // If player, connect to host
      if (!isHost && hostId) {
        console.log('Attempting to connect to:', hostId);
        setTimeout(() => this.connectToHost(hostId), 1000);
      }
    });

    // Host: Listen for incoming connections
    if (isHost) {
      this.peer.on('connection', (conn) => {
        this.setupConnection(conn);
      });
    }

    this.peer.on('error', (err) => {
      console.error('P2P error:', err);
      alert('Connection error. Please try again.');
    });
  }

  // Player connects to host
  private connectToHost(hostId: string) {
    if (!this.peer) return;
    
    console.log('Connecting to host:', hostId);
    const conn = this.peer.connect(hostId, { reliable: true });
    this.setupConnection(conn);
  }

  // Setup connection handlers
  private setupConnection(conn: DataConnection) {
    conn.on('open', () => {
      console.log('✅ Connected to:', conn.peer);
      this.connections.set(conn.peer, conn);
      this.connectionHandlers.forEach(h => h());
    });

    conn.on('data', (data) => {
      this.handlers.forEach(handler => handler(data, conn.peer));
    });

    conn.on('close', () => {
      console.log('❌ Disconnected:', conn.peer);
      this.connections.delete(conn.peer);
    });

    conn.on('error', (err) => {
      console.error('Connection error:', err);
    });
  }

  // Send message to specific peer or broadcast (host only)
  send(data: any, peerId?: string) {
    if (peerId) {
      const conn = this.connections.get(peerId);
      if (conn && conn.open) conn.send(data);
    } else {
      this.connections.forEach(conn => {
        if (conn.open) conn.send(data);
      });
    }
  }

  // Subscribe to messages
  subscribe(handler: MessageHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  // Subscribe to connection events
  onConnection(handler: ConnectionHandler) {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  // Get connected peers
  getPeers() {
    return Array.from(this.connections.keys());
  }

  // Disconnect
  disconnect() {
    this.connections.forEach(conn => conn.close());
    this.connections.clear();
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }
}

export const p2pService = new P2PService();
