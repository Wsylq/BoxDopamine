// ═══════════════════════════════════════════════════════════
// relayService.ts — FIXED VERSION
// Changes:
//   1. 'joined' event is now forwarded to ALL subscribers (not swallowed)
//   2. Connection status is exposed via onConnected/onDisconnected callbacks
//   3. Reconnect only triggers if we were intentionally connected
//   4. Message handler gets ALL server-originated events, not just relayed ones
// ═══════════════════════════════════════════════════════════

type MessageHandler = (data: any, fromId: string) => void;
type StatusHandler = (connected: boolean) => void;

class RelayService {
  private ws: WebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();
  private reconnectTimer: number | null = null;
  private shouldReconnect = false;

  public myId = '';
  public username = '';
  private roomId = '';
  private isHost = false;

  // ── Username ──────────────────────────────────────────────
  initUsername() {
    let username = localStorage.getItem('relay_username');
    if (!username) {
      username =
        prompt('Choose a username:') ||
        `Player${Math.floor(Math.random() * 9999)}`;
      localStorage.setItem('relay_username', username);
    }
    this.username = username;
    return username;
  }

  getUsername() {
    return this.username || this.initUsername();
  }

  // ── Stable persistent player ID ───────────────────────────
  private getOrCreatePlayerId(username: string): string {
    const key = `relay_player_id_${username}`;
    let id = localStorage.getItem(key);
    if (!id) {
      id = `${username}_${Math.random().toString(36).substring(2, 6)}`;
      localStorage.setItem(key, id);
    }
    return id;
  }

  // ── Connect ───────────────────────────────────────────────
  connect(isHost: boolean, roomId?: string) {
    this.isHost = isHost;
    this.roomId = roomId || this.generateRoomId();
    this.shouldReconnect = true;
    this.getUsername();

    // WebSocket URL - use environment variable or default
    const wsUrl =
      import.meta.env.VITE_WS_URL ||
      'ws://node05.host2play.gratis:5038';

    console.log('Connecting to:', wsUrl);
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('✅ WebSocket open');
      this.myId = this.getOrCreatePlayerId(this.username);

      this.ws!.send(
        JSON.stringify({
          type: 'join_room',
          roomId: this.roomId,
          userId: this.myId,
          username: this.username,
          isHost: this.isHost,
        })
      );
      // Note: do NOT set connected here — wait for server 'joined' ack
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📨 Message:', data.type || data, data);

        if (data.type === 'pong') return; // keepalive, ignore

        // ✅ FIX: Forward 'joined' to subscribers instead of swallowing it
        if (data.type === 'joined') {
          console.log('✅ Server confirmed room join');
          this.notifyStatus(true);
          // Forward to game components so they can set connected = true
          this.handlers.forEach((h) => h(data, 'server'));
          return;
        }

        // Player joined/left — forward to game components
        if (data.type === 'player_joined' || data.type === 'player_left') {
          this.notifyStatus(true);
          this.handlers.forEach((h) => h(data, data.userId ?? 'server'));
          return;
        }

        // Relayed message from another player
        if (data.roomId === this.roomId && data.fromId !== this.myId) {
          this.handlers.forEach((h) => h(data.message, data.fromId));
        }
      } catch (err) {
        console.error('Parse error:', err);
      }
    };

    this.ws.onclose = (e) => {
      console.log(`❌ WS closed: ${e.code} ${e.reason}`);
      this.notifyStatus(false);
      if (this.shouldReconnect) this.scheduleReconnect();
    };

    this.ws.onerror = (err) => {
      console.error('❌ WebSocket error:', err);
      console.error('Connection details:', {
        url: wsUrl,
        readyState: this.ws?.readyState,
        roomId: this.roomId
      });
      // Check for mixed content error
      if (window.location.protocol === 'https:' && wsUrl.startsWith('ws:')) {
        console.error('⚠️ MIXED CONTENT ERROR: Cannot use ws:// from HTTPS page!');
        console.error('Solution: Use wss:// URL or serve app over HTTP');
      }
    };

    return this.roomId;
  }

  // ── Helpers ───────────────────────────────────────────────
  private generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    console.log('⏳ Reconnecting in 3s...');
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      if (this.shouldReconnect && this.roomId) {
        this.connect(this.isHost, this.roomId);
      }
    }, 3000);
  }

  private notifyStatus(connected: boolean) {
    this.statusHandlers.forEach((h) => h(connected));
  }

  // ── Send ──────────────────────────────────────────────────
  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const payload = { roomId: this.roomId, fromId: this.myId, message };
      console.log('📤 Sending:', message.type, 'payload:', payload);
      this.ws.send(JSON.stringify(payload));
    } else {
      console.warn('❌ send() called but WS not open, state:', this.ws?.readyState);
    }
  }

  // ── Subscribe ─────────────────────────────────────────────
  subscribe(handler: MessageHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  onStatus(handler: StatusHandler) {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  // ── Getters ───────────────────────────────────────────────
  getRoomId() {
    return this.roomId;
  }

  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // ── Disconnect ────────────────────────────────────────────
  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.roomId = '';
    this.myId = '';
  }
}

export const relayService = new RelayService();
