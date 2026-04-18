// ═══════════════════════════════════════════════════════════
// Multiplayer WebSocket Service
// ═══════════════════════════════════════════════════════════

import type {
  User,
  GameSession,
  ChatMessage,
  WSMessage,
  WSResponse,
  TurnAction,
} from '../types/multiplayer';

type MessageHandler = (message: WSResponse) => void;

class MultiplayerService {
  private ws: WebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private reconnectTimer: number | null = null;
  private userId: string | null = null;
  private username: string | null = null;

  connect(userId: string, username: string) {
    this.userId = userId;
    this.username = username;

    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('✅ Connected to multiplayer server');
      this.send({ type: 'auth', userId, username });
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WSResponse = JSON.parse(event.data);
        this.handlers.forEach(handler => handler(message));
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('❌ Disconnected from server');
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      if (this.userId && this.username) {
        this.connect(this.userId, this.username);
      }
    }, 3000);
  }

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

  send(message: WSMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected');
    }
  }

  subscribe(handler: MessageHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  // Friend management
  getFriends() {
    this.send({ type: 'get_friends' });
  }

  sendFriendRequest(targetUserId: string) {
    this.send({ type: 'friend_request', targetUserId });
  }

  acceptFriendRequest(requesterId: string) {
    this.send({ type: 'friend_accept', requesterId });
  }

  rejectFriendRequest(requesterId: string) {
    this.send({ type: 'friend_reject', requesterId });
  }

  // Game management
  createGame(mode: 'duo' | 'trio', bet: number, gridSize: number, mineCount: number) {
    this.send({ type: 'create_game', mode, bet, gridSize, mineCount });
  }

  inviteFriend(friendId: string, gameId: string) {
    this.send({ type: 'invite_friend', friendId, gameId });
  }

  joinGame(gameId: string, bet: number) {
    this.send({ type: 'join_game', gameId, bet });
  }

  ready(gameId: string) {
    this.send({ type: 'ready', gameId });
  }

  makeMove(gameId: string, row: number, col: number) {
    this.send({ type: 'make_move', gameId, row, col });
  }

  cashout(gameId: string) {
    this.send({ type: 'cashout', gameId });
  }

  sendChat(gameId: string, message: string) {
    this.send({ type: 'chat', gameId, message });
  }

  getAvailableGames() {
    this.send({ type: 'get_games' });
  }
}

export const multiplayerService = new MultiplayerService();
