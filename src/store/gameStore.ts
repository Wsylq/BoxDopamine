// ═══════════════════════════════════════════════════════════
// Game Store — Currency, Sound, Haptics, Persistence
// ═══════════════════════════════════════════════════════════

import { Haptics, ImpactStyle } from '@capacitor/haptics';

export type GameId = 'coinflip' | 'higherlower' | 'plinko' | 'scratch' | 'dice';

const STORAGE_KEY = 'dopamine_box_v2';

interface StoredState {
  balance: number;
  streak: number;
  lastPlayed: string;
  totalWins: number;
  totalLosses: number;
  biggestWin: number;
}

function loadState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    balance: 1000,
    streak: 1,
    lastPlayed: new Date().toDateString(),
    totalWins: 0,
    totalLosses: 0,
    biggestWin: 0,
  };
}

function saveState(s: StoredState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

// Singleton state
let _state = loadState();

// Update streak on load
const today = new Date().toDateString();
if (_state.lastPlayed !== today) {
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (_state.lastPlayed === yesterday) {
    _state.streak += 1;
  } else {
    _state.streak = 1;
  }
  _state.lastPlayed = today;
  saveState(_state);
}

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribe(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach(fn => fn());
}

export function getState() {
  return { ..._state };
}

export function addBalance(amount: number) {
  _state.balance = Math.max(0, _state.balance + amount);
  if (amount > 0) {
    if (amount > _state.biggestWin) _state.biggestWin = amount;
    _state.totalWins += 1;
  } else if (amount < 0) {
    _state.totalLosses += 1;
  }
  _state.lastPlayed = new Date().toDateString();
  saveState(_state);
  notify();
}

export function resetBalance() {
  _state.balance = 1000;
  saveState(_state);
  notify();
}

export function formatCurrency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

// ── Audio Engine ───────────────────────────────────────────────────────────
let _ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!_ctx) _ctx = new AudioContext();
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

function playTone(freq: number, type: OscillatorType, duration: number, vol = 0.3) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = type;
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

export const sounds = {
  click() { playTone(800, 'sine', 0.05, 0.15); },
  coin() {
    playTone(1200, 'sine', 0.1, 0.2);
    setTimeout(() => playTone(1600, 'sine', 0.08, 0.2), 60);
  },
  win() {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => playTone(f, 'sine', 0.2, 0.35), i * 80);
    });
  },
  bigWin() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => {
      setTimeout(() => playTone(f, 'triangle', 0.25, 0.35), i * 60);
    });
  },
  lose() {
    playTone(300, 'sawtooth', 0.15, 0.25);
    setTimeout(() => playTone(200, 'sawtooth', 0.15, 0.3), 100);
  },
  flip() { playTone(600, 'square', 0.08, 0.12); },
  peg() { playTone(440 + Math.random() * 200, 'sine', 0.06, 0.15); },
  woohoo() {
    [523, 784, 1047, 784, 1047, 1319].forEach((f, i) => {
      setTimeout(() => playTone(f, 'sine', 0.18, 0.3), i * 70);
    });
  },
  swoosh() { playTone(200, 'sine', 0.05, 0.1); },
  reward() {
    playTone(880, 'sine', 0.12, 0.2);
    setTimeout(() => playTone(1100, 'sine', 0.1, 0.2), 80);
  },
};

// ── Haptics ─────────────────────────────────────────────────────────────────

export const haptics = {
  async light() {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Fallback to web API
      try { navigator.vibrate?.(10); } catch {}
    }
  },
  async medium() {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Fallback to web API
      try { navigator.vibrate?.(25); } catch {}
    }
  },
  async heavy() {
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch {
      // Fallback to web API
      try { navigator.vibrate?.(50); } catch {}
    }
  },
  async win() {
    try {
      // Success notification pattern
      await Haptics.notification({ type: 'SUCCESS' });
    } catch {
      // Fallback to web API
      try { navigator.vibrate?.([30, 20, 30, 20, 60]); } catch {}
    }
  },
  async lose() {
    try {
      // Error notification pattern
      await Haptics.notification({ type: 'ERROR' });
    } catch {
      // Fallback to web API
      try { navigator.vibrate?.([100, 30, 100]); } catch {}
    }
  },
  async pattern(p: number[]) {
    try {
      // Capacitor doesn't support custom patterns, use medium impact as fallback
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Fallback to web API
      try { navigator.vibrate?.(p); } catch {}
    }
  },
  // Distinct game-event patterns
  async bomb() {
    // Long thud + two short aftershocks
    try { await Haptics.notification({ type: 'ERROR' }); } catch {}
    try { navigator.vibrate?.([80, 40, 40, 40, 40]); } catch {}
  },
  async cashout() {
    // Quick triple tap — satisfying
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
      setTimeout(() => Haptics.impact({ style: ImpactStyle.Medium }), 80);
      setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }), 160);
    } catch {}
    try { navigator.vibrate?.([20, 40, 20, 40, 60]); } catch {}
  },
  async safeTile() {
    // Single crisp light tap
    try { await Haptics.impact({ style: ImpactStyle.Light }); } catch {}
    try { navigator.vibrate?.(12); } catch {}
  },
  async cardFlip() {
    // Soft click
    try { await Haptics.impact({ style: ImpactStyle.Light }); } catch {}
    try { navigator.vibrate?.(8); } catch {}
  },
  async blackjackWin() {
    // Rising triple
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
      setTimeout(() => Haptics.impact({ style: ImpactStyle.Medium }), 100);
      setTimeout(() => Haptics.notification({ type: 'SUCCESS' }), 220);
    } catch {}
    try { navigator.vibrate?.([15, 60, 25, 60, 50]); } catch {}
  },
  async blackjackBust() {
    // Heavy single thud
    try { await Haptics.notification({ type: 'ERROR' }); } catch {}
    try { navigator.vibrate?.([120]); } catch {}
  },
};
