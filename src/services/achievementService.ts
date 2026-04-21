// ═══════════════════════════════════════════════════════════
// Achievement Service
// ═══════════════════════════════════════════════════════════

export interface Achievement {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  unlockedAt?: number; // timestamp
}

export const ALL_ACHIEVEMENTS: Omit<Achievement, 'unlockedAt'>[] = [
  // ── Solo games ──────────────────────────────────────────
  { id: 'first_win',       emoji: '🎉', name: 'First Blood',       desc: 'Win your first game' },
  { id: 'balance_10k',     emoji: '💰', name: 'Five Figures',       desc: 'Reach $10,000 balance' },
  { id: 'balance_100k',    emoji: '🤑', name: 'Six Figures',        desc: 'Reach $100,000 balance' },
  { id: 'balance_1m',      emoji: '💎', name: 'Millionaire',        desc: 'Reach $1,000,000 balance' },
  { id: 'streak_3',        emoji: '🔥', name: 'On Fire',            desc: '3-day login streak' },
  { id: 'streak_7',        emoji: '🌋', name: 'Week Warrior',       desc: '7-day login streak' },
  { id: 'big_win_500',     emoji: '💥', name: 'Big Spender',        desc: 'Win $500 in a single game' },
  { id: 'big_win_5000',    emoji: '🚀', name: 'To The Moon',        desc: 'Win $5,000 in a single game' },
  // ── Avalanche ───────────────────────────────────────────
  { id: 'av_survive_5',    emoji: '🏔️', name: 'Avalanche Rookie',   desc: 'Survive 5 tiles in Avalanche' },
  { id: 'av_survive_10',   emoji: '⛰️', name: 'Tile Survivor',      desc: 'Survive 10 tiles in Avalanche' },
  { id: 'av_survive_15',   emoji: '🗻', name: 'Untouchable',        desc: 'Survive 15 tiles in Avalanche' },
  { id: 'av_cashout_10x',  emoji: '💸', name: 'Smart Money',        desc: 'Team cashout at 10x or higher' },
  { id: 'av_cashout_50x',  emoji: '🏆', name: 'Greed is Good',      desc: 'Team cashout at 50x or higher' },
  { id: 'av_cashout_100x', emoji: '👑', name: 'Legendary',          desc: 'Team cashout at 100x or higher' },
  // ── Blackjack ───────────────────────────────────────────
  { id: 'bj_win',          emoji: '🃏', name: 'Card Shark',         desc: 'Win a Collective Blackjack game' },
  { id: 'bj_natural_21',   emoji: '⚡', name: 'Natural 21',         desc: 'Get dealt a natural blackjack' },
  { id: 'bj_win_5',        emoji: '🎴', name: 'House Beater',       desc: 'Win 5 Blackjack games' },
  // ── Minesweeper ─────────────────────────────────────────
  { id: 'ms_win',          emoji: '💣', name: 'Defuser',            desc: 'Win a Team Minesweeper game' },
  { id: 'ms_win_5',        emoji: '🧨', name: 'Bomb Squad',         desc: 'Win 5 Team Minesweeper games' },
  { id: 'ms_15_mines',     emoji: '☠️', name: 'Death Wish',         desc: 'Win Minesweeper with 15 mines' },
  // ── Social ──────────────────────────────────────────────
  { id: 'play_multiplayer',emoji: '👥', name: 'Team Player',        desc: 'Complete a multiplayer game' },
  { id: 'invite_friend',   emoji: '📨', name: 'Social Butterfly',   desc: 'Invite a friend to a game' },
];

const STORAGE_KEY = 'dopamine_achievements';

class AchievementService {
  private unlocked: Map<string, number> = new Map(); // id → timestamp
  private listeners = new Set<(a: Achievement) => void>();

  constructor() {
    this.load();
  }

  private load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data: Record<string, number> = JSON.parse(raw);
        Object.entries(data).forEach(([id, ts]) => this.unlocked.set(id, ts));
      }
    } catch {}
  }

  private save() {
    const data: Record<string, number> = {};
    this.unlocked.forEach((ts, id) => { data[id] = ts; });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  getAll(): Achievement[] {
    return ALL_ACHIEVEMENTS.map(a => ({
      ...a,
      unlockedAt: this.unlocked.get(a.id),
    }));
  }

  isUnlocked(id: string): boolean {
    return this.unlocked.has(id);
  }

  // Returns the achievement if newly unlocked, null if already had it
  unlock(id: string): Achievement | null {
    if (this.unlocked.has(id)) return null;
    const def = ALL_ACHIEVEMENTS.find(a => a.id === id);
    if (!def) return null;
    const ts = Date.now();
    this.unlocked.set(id, ts);
    this.save();
    const achievement: Achievement = { ...def, unlockedAt: ts };
    this.listeners.forEach(fn => fn(achievement));
    return achievement;
  }

  onUnlock(fn: (a: Achievement) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

export const achievementService = new AchievementService();
