// ═══════════════════════════════════════════════════════════
// Friends Service (Local Storage)
// ═══════════════════════════════════════════════════════════

interface Friend {
  id: string;
  name: string;
  addedAt: number;
}

export interface GameInvite {
  fromUsername: string;
  roomId: string;
  gameType: 'minesweeper' | 'avalanche' | 'blackjack';
  receivedAt: number;
}

const STORAGE_KEY = 'dopamine_friends';

class FriendsService {
  private listeners = new Set<() => void>();
  private inviteListeners = new Set<(invite: GameInvite) => void>();
  // Per-friend cooldown: friendId → last invite sent timestamp
  private inviteCooldowns = new Map<string, number>();

  getFriends(): Friend[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  addFriend(id: string, name: string) {
    const friends = this.getFriends();
    // id and name are both the username
    if (!friends.find(f => f.id.toLowerCase() === id.toLowerCase())) {
      friends.push({ id, name, addedAt: Date.now() });
      this.save(friends);
    }
  }

  removeFriend(id: string) {
    const friends = this.getFriends().filter(f => f.id !== id);
    this.save(friends);
  }

  // Returns ms remaining on cooldown, 0 if ready
  getInviteCooldown(friendId: string): number {
    const last = this.inviteCooldowns.get(friendId) ?? 0;
    const elapsed = Date.now() - last;
    return Math.max(0, 5000 - elapsed);
  }

  recordInviteSent(friendId: string) {
    this.inviteCooldowns.set(friendId, Date.now());
  }

  // Called when we receive an invite from the relay
  receiveInvite(invite: GameInvite) {
    this.inviteListeners.forEach(fn => fn(invite));
  }

  onInvite(fn: (invite: GameInvite) => void) {
    this.inviteListeners.add(fn);
    return () => this.inviteListeners.delete(fn);
  }

  private save(friends: Friend[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(friends));
    this.notify();
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }
}

export const friendsService = new FriendsService();
