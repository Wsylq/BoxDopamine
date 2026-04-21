// ═══════════════════════════════════════════════════════════
// Auth Service — register / login over WebSocket (same port as relay)
// ═══════════════════════════════════════════════════════════

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://node05.host2play.gratis:5038';
const TOKEN_KEY = 'dopamine_auth_token';
const USER_KEY  = 'dopamine_auth_user';

export interface AuthUser {
  username: string;
  token: string;
}

// Send a one-shot auth message over a fresh WebSocket and wait for the response
function authRequest(type: 'auth_register' | 'auth_login', username: string, password: string): Promise<AuthUser> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Connection timed out'));
    }, 8000);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type, username, password }));
    };

    ws.onmessage = (event) => {
      clearTimeout(timeout);
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'auth_ok') {
          ws.close();
          resolve({ username: data.username, token: data.token });
        } else if (data.type === 'auth_error') {
          ws.close();
          reject(new Error(data.error || 'Auth failed'));
        }
        // ignore other messages (pong, etc.)
      } catch {
        ws.close();
        reject(new Error('Invalid server response'));
      }
    };

    ws.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Could not connect to server'));
    };

    ws.onclose = (e) => {
      clearTimeout(timeout);
      if (e.code !== 1000) reject(new Error('Connection closed unexpectedly'));
    };
  });
}

class AuthService {
  private listeners = new Set<(user: AuthUser | null) => void>();

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  async register(username: string, password: string): Promise<AuthUser> {
    const user = await authRequest('auth_register', username.trim(), password);
    return this.saveSession(user);
  }

  async login(username: string, password: string): Promise<AuthUser> {
    const user = await authRequest('auth_login', username.trim(), password);
    return this.saveSession(user);
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('relay_username');
    this.notify(null);
  }

  subscribe(fn: (user: AuthUser | null) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private saveSession(user: AuthUser): AuthUser {
    localStorage.setItem(TOKEN_KEY, user.token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem('relay_username', user.username);
    this.notify(user);
    return user;
  }

  private notify(user: AuthUser | null) {
    this.listeners.forEach(fn => fn(user));
  }
}

export const authService = new AuthService();
