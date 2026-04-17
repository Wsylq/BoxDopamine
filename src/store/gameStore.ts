// ============================================================
// DOPAMINE BOX - Global Game Store
// ============================================================

export const TARGET_AMOUNT = 10_000_000;

export const haptic = {
  light: () => { if (navigator.vibrate) navigator.vibrate(10); },
  medium: () => { if (navigator.vibrate) navigator.vibrate(30); },
  heavy: () => { if (navigator.vibrate) navigator.vibrate([50, 20, 50]); },
  success: () => { if (navigator.vibrate) navigator.vibrate([30, 10, 30, 10, 60]); },
  error: () => { if (navigator.vibrate) navigator.vibrate([80, 30, 80]); },
  coin: () => { if (navigator.vibrate) navigator.vibrate([5, 5, 5]); },
  win: () => { if (navigator.vibrate) navigator.vibrate([20, 10, 20, 10, 40, 10, 80]); },
  lose: () => { if (navigator.vibrate) navigator.vibrate([100, 30, 100, 30, 100]); },
  jackpot: () => { if (navigator.vibrate) navigator.vibrate([50, 20, 50, 20, 50, 20, 200]); },
};

class SoundEngine {
  private ctx: AudioContext | null = null;

  private getCtx(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  playTone(freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.3) {
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gainNode.gain.setValueAtTime(gain, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (_e) { /* ignore */ }
  }

  playWin() {
    this.playTone(523, 0.1, 'sine', 0.4);
    setTimeout(() => this.playTone(659, 0.1, 'sine', 0.4), 100);
    setTimeout(() => this.playTone(784, 0.15, 'sine', 0.4), 200);
    setTimeout(() => this.playTone(1047, 0.3, 'sine', 0.5), 320);
  }

  playLose() {
    this.playTone(300, 0.15, 'square', 0.3);
    setTimeout(() => this.playTone(200, 0.3, 'square', 0.3), 160);
  }

  playCoin() {
    this.playTone(880, 0.05, 'sine', 0.2);
    setTimeout(() => this.playTone(1100, 0.08, 'sine', 0.2), 60);
  }

  playJackpot() {
    const notes = [523, 587, 659, 698, 784, 880, 988, 1047];
    notes.forEach((note, i) => {
      setTimeout(() => this.playTone(note, 0.15, 'sine', 0.4), i * 80);
    });
  }

  playFlap() { this.playTone(440, 0.05, 'square', 0.15); }
  playClick() { this.playTone(800, 0.03, 'sine', 0.2); }
  playPlinko() { this.playTone(600 + Math.random() * 400, 0.06, 'sine', 0.25); }

  playWoohoo() {
    const notes = [392, 440, 494, 523, 587, 659, 784, 880, 1047];
    notes.forEach((note, i) => {
      setTimeout(() => this.playTone(note, 0.12, 'sine', 0.5), i * 60);
    });
    setTimeout(() => this.playTone(1047, 0.4, 'sine', 0.6), 560);
  }

  playCardFlip() {
    this.playTone(350, 0.08, 'triangle', 0.2);
    setTimeout(() => this.playTone(450, 0.08, 'triangle', 0.2), 80);
  }

  playHigherLower(correct: boolean) {
    if (correct) {
      this.playTone(660, 0.1, 'sine', 0.3);
      setTimeout(() => this.playTone(880, 0.15, 'sine', 0.3), 120);
    } else {
      this.playTone(250, 0.2, 'square', 0.25);
    }
  }
}

export const sound = new SoundEngine();

export const formatCurrency = (amount: number): string => {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount.toFixed(0)}`;
};

const STORAGE_KEYS = {
  balance: 'db_balance',
  streak: 'db_streak',
  lastPlayed: 'db_last_played',
  totalWins: 'db_total_wins',
  totalLosses: 'db_total_losses',
};

export const loadFromStorage = () => {
  const today = new Date().toDateString();
  const lastPlayed = localStorage.getItem(STORAGE_KEYS.lastPlayed) || '';
  const storedStreak = parseInt(localStorage.getItem(STORAGE_KEYS.streak) || '1', 10);

  let streak = storedStreak;
  if (lastPlayed) {
    const lastDate = new Date(lastPlayed);
    const todayDate = new Date();
    const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 1) streak = 1;
    else if (diffDays === 1) streak = storedStreak + 1;
  }

  return {
    balance: parseFloat(localStorage.getItem(STORAGE_KEYS.balance) || '1000'),
    streak,
    totalWins: parseInt(localStorage.getItem(STORAGE_KEYS.totalWins) || '0', 10),
    totalLosses: parseInt(localStorage.getItem(STORAGE_KEYS.totalLosses) || '0', 10),
    lastPlayed: today,
  };
};

export const saveToStorage = (balance: number, streak: number, totalWins: number, totalLosses: number) => {
  const today = new Date().toDateString();
  localStorage.setItem(STORAGE_KEYS.balance, balance.toString());
  localStorage.setItem(STORAGE_KEYS.streak, streak.toString());
  localStorage.setItem(STORAGE_KEYS.lastPlayed, today);
  localStorage.setItem(STORAGE_KEYS.totalWins, totalWins.toString());
  localStorage.setItem(STORAGE_KEYS.totalLosses, totalLosses.toString());
};
