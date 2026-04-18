// ═══════════════════════════════════════════════════════════
// P2P Multiplayer Service (WebRTC)
// ═══════════════════════════════════════════════════════════

import Peer, { DataConnection } from 'peerjs';

type MessageHandler = (data: any, peerId: string) => void;

class P2PService {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private handlers: Set<MessageHandler> = new Set();
  private isHost = false;
  public myId = '';

  // Initialize as host or player
  init(isHost: boolean, hostId?: string) {
    this.isHost = isHost;
    
    // Create peer with custom ID for host, random for players
    const peerId = isHost ? `host_${Date.now()}` : undefined;
    
    this.peer = new Peer(peerId, {
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    this.peer.on('open', (id) => {
      this.myId = id;
      console.log('✅ P2P connected:', id);
      
      // If player, connect to host
      if (!isHost && hostId) {
        this.connectToHost(hostId);
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
    });
  }

  // Player connects to host
  private connectToHost(hostId: string) {
    if (!this.peer) return;
    
    const conn = this.peer.connect(hostId, { reliable: true });
    this.setupConnection(conn);
  }

  // Setup connection handlers
  private setupConnection(conn: DataConnection) {
    conn.on('open', () => {
      console.log('✅ Connected to:', conn.peer);
      this.connections.set(conn.peer, conn);
    });

    conn.on('data', (data) => {
      this.handlers.forEach(handler => handler(data, conn.peer));
    });

    conn.on('close', () => {
      console.log('❌ Disconnected:', conn.peer);
      this.connections.delete(conn.peer);
    });
  }

  // Send message to specific peer or broadcast (host only)
  send(data: any, peerId?: string) {
    if (peerId) {
      // Send to specific peer
      const conn = this.connections.get(peerId);
      if (conn) conn.send(data);
    } else {
      // Broadcast to all
      this.connections.forEach(conn => conn.send(data));
    }
  }

  // Subscribe to messages
  subscribe(handler: MessageHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
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
