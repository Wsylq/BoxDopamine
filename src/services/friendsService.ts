// ═══════════════════════════════════════════════════════════
// Friends Service (Local Storage)
// ═══════════════════════════════════════════════════════════

interface Friend {
  id: string;
  name: string;
  addedAt: number;
}

const STORAGE_KEY = 'dopamine_friends';

class FriendsService {
  private listeners = new Set<() => void>();

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
    if (!friends.find(f => f.id === id)) {
      friends.push({ id, name, addedAt: Date.now() });
      this.save(friends);
    }
  }

  removeFriend(id: string) {
    const friends = this.getFriends().filter(f => f.id !== id);
    this.save(friends);
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
