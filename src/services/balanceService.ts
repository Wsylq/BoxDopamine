// ═══════════════════════════════════════════════════════════
// Balance Service — server-authoritative balance
// All game results go through here, not directly to gameStore
// ═══════════════════════════════════════════════════════════

import { authService } from './authService';
import { setServerBalance } from '../store/gameStore';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://node05.host2play.gratis:5038';

type BalanceListener = (balance: number) => void;

class BalanceService {
  private ws: WebSocket | null = null;
  private listeners = new Set<BalanceListener>();
  private pendingResolvers = new Map<string, (balance: number) => void>();
  private _balance = 0;
  private _connected = false;

  get balance() { return this._balance; }

  // Called after login — sets initial balance from auth response
  init(initialBalance: number) {
    this._balance = initialBalance;
    setServerBalance(initialBalance);
    this.connectPersistent();
  }

  // Persistent WS for receiving balance_update pushes
  private connectPersistent() {
    if (this.ws && this.ws.readyState <= WebSocket.OPEN) return;
    this.ws = new WebSocket(WS_URL);
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'balance_update' || data.type === 'balance_ok') {
          this._balance = data.balance;
          setServerBalance(data.balance);
          // Call any pending resolver for this gameId
          const resolver = this.pendingResolvers.get(data.gameId || '');
          if (resolver) {
            resolver(data.balance);
            this.pendingResolvers.delete(data.gameId || '');
          }
        }
      } catch {}
    };
    this.ws.onclose = () => {
      this._connected = false;
      setTimeout(() => this.connectPersistent(), 3000);
    };
    this.ws.onopen = () => { this._connected = true; };
  }

  // Send a game result to the server and get back the new balance
  async reportResult(delta: number, gameId: string): Promise<number> {
    const token = authService.getToken();

    // Optimistic update immediately — UI feels instant
    this._balance = Math.max(0, this._balance + delta);
    setServerBalance(this._balance);

    if (!token) return this._balance;

    // Then confirm with server (corrects any discrepancy)
    const key = gameId + '_' + Date.now();

    const send = () => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'game_result', token, delta, gameId: key }));
      }
    };

    // Store resolver so server response updates balance if it differs
    this.pendingResolvers.set(key, (serverBalance: number) => {
      if (serverBalance !== this._balance) {
        this._balance = serverBalance;
        setServerBalance(serverBalance);
      }
    });

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      send();
    } else {
      const check = setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          clearInterval(check);
          send();
        }
      }, 100);
      // Give up after 5s — optimistic value stays
      setTimeout(() => {
        clearInterval(check);
        this.pendingResolvers.delete(key);
      }, 5000);
    }

    return this._balance;
  }

  subscribe(fn: BalanceListener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    this.listeners.forEach(fn => fn(this._balance));
  }

  reset() {
    this._balance = 0;
    this.ws?.close();
    this.ws = null;
  }
}

export const balanceService = new BalanceService();
