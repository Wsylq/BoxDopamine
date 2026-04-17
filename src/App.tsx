// ============================================================
// DOPAMINE BOX - Main App
// Phone-only, iOS-style liquid glass bottom bar
// No homepage — games screen is the main screen
// ============================================================
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GameModal from './components/GameModal';
import ParticleEffect from './components/ParticleEffect';
import {
  loadFromStorage, saveToStorage, formatCurrency,
  haptic, sound, TARGET_AMOUNT
} from './store/gameStore';

type GameType = 'coinflip' | 'higherlower' | 'plinko' | 'flappy' | null;
type TabType = 'games' | 'stats';

// ── TOAST ────────────────────────────────────────────────────
interface ToastProps {
  message: string;
  type: 'win' | 'lose' | 'info';
  onDone: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -80, opacity: 0 }}
      className="fixed top-14 left-1/2 -translate-x-1/2 z-[9998] px-6 py-3 rounded-2xl text-sm font-bold text-white shadow-2xl"
      style={{
        background: type === 'win'
          ? 'linear-gradient(135deg, rgba(34,197,94,0.9), rgba(22,163,74,0.9))'
          : type === 'lose'
          ? 'linear-gradient(135deg, rgba(239,68,68,0.9), rgba(185,28,28,0.9))'
          : 'rgba(30,30,30,0.9)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.15)',
        maxWidth: '80vw',
        textAlign: 'center',
        whiteSpace: 'nowrap',
      }}
    >
      {message}
    </motion.div>
  );
};

// ── GAME CARDS ───────────────────────────────────────────────
const GAMES = [
  {
    id: 'coinflip' as GameType,
    emoji: '🪙',
    label: 'Coin Flip',
    sub: 'Double or Nothing',
    color: '#FF8C00',
    glow: 'rgba(255,140,0,0.35)',
    bg: 'linear-gradient(135deg, #1a0f00, #2d1a00)',
    border: 'rgba(255,140,0,0.3)',
  },
  {
    id: 'higherlower' as GameType,
    emoji: '🃏',
    label: 'Higher or Lower',
    sub: 'Chain wins for big multipliers',
    color: '#a78bfa',
    glow: 'rgba(167,139,250,0.35)',
    bg: 'linear-gradient(135deg, #0e0a1a, #1a1030)',
    border: 'rgba(167,139,250,0.3)',
  },
  {
    id: 'plinko' as GameType,
    emoji: '🎯',
    label: 'Plinko',
    sub: 'Drop the ball, win big',
    color: '#00FF94',
    glow: 'rgba(0,255,148,0.3)',
    bg: 'linear-gradient(135deg, #001a0e, #002d1a)',
    border: 'rgba(0,255,148,0.25)',
  },
  {
    id: 'flappy' as GameType,
    emoji: '🐦',
    label: 'Flappy Coins',
    sub: '+coins per gap survived',
    color: '#FFD700',
    glow: 'rgba(255,215,0,0.35)',
    bg: 'linear-gradient(135deg, #0f0d00, #1a1800)',
    border: 'rgba(255,215,0,0.3)',
  },
];

// ── STATS SCREEN ─────────────────────────────────────────────
const StatsScreen: React.FC<{
  balance: number; streak: number; totalWins: number; totalLosses: number;
}> = ({ balance, streak, totalWins, totalLosses }) => {
  const winRate = totalWins + totalLosses > 0
    ? Math.round((totalWins / (totalWins + totalLosses)) * 100)
    : 0;
  const progress = Math.min((balance / TARGET_AMOUNT) * 100, 100);

  return (
    <div className="flex flex-col gap-5 px-5 py-6">
      {/* Goal Progress */}
      <div
        className="rounded-3xl p-5"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="text-white/40 text-xs tracking-widest uppercase mb-3">$10M Goal</div>
        <div className="flex justify-between items-end mb-2">
          <span className="text-2xl font-black text-white">{formatCurrency(balance)}</span>
          <span className="text-white/30 text-xs">$10M</span>
        </div>
        <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #22c55e, #FFD700)',
            }}
          />
        </div>
        <div className="text-white/30 text-xs mt-2 text-right">{progress.toFixed(4)}%</div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Day Streak', value: `🔥 ${streak}`, color: '#FF6B00' },
          { label: 'Win Rate', value: `${winRate}%`, color: '#22c55e' },
          { label: 'Total Wins', value: totalWins, color: '#60a5fa' },
          { label: 'Total Losses', value: totalLosses, color: '#ef4444' },
        ].map(stat => (
          <div
            key={stat.label}
            className="rounded-2xl p-4 flex flex-col gap-1"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="text-white/40 text-xs">{stat.label}</div>
            <div className="font-black text-2xl" style={{ color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Streak info */}
      <div
        className="rounded-2xl p-4"
        style={{ background: 'rgba(255,107,0,0.08)', border: '1px solid rgba(255,107,0,0.2)' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl">🔥</span>
          <div>
            <div className="font-bold text-white text-sm">{streak} Day Streak</div>
            <div className="text-white/40 text-xs mt-0.5">Come back tomorrow to keep it going!</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── MAIN APP ─────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState<TabType>('games');
  const [activeGame, setActiveGame] = useState<GameType>(null);
  const [balance, setBalance] = useState(1000);
  const [streak, setStreak] = useState(1);
  const [totalWins, setTotalWins] = useState(0);
  const [totalLosses, setTotalLosses] = useState(0);
  const [toast, setToast] = useState<{ message: string; type: 'win' | 'lose' | 'info' } | null>(null);
  const [showParticles, setShowParticles] = useState(false);

  // Load saved state
  useEffect(() => {
    const data = loadFromStorage();
    setBalance(data.balance);
    setStreak(data.streak);
    setTotalWins(data.totalWins);
    setTotalLosses(data.totalLosses);
  }, []);

  // Save on change
  useEffect(() => {
    saveToStorage(balance, streak, totalWins, totalLosses);
  }, [balance, streak, totalWins, totalLosses]);

  const handleResult = useCallback((delta: number, won: boolean) => {
    setBalance(prev => {
      const next = Math.max(0, prev + delta);
      return next;
    });
    if (won) {
      setTotalWins(w => w + 1);
      setToast({ message: `+${formatCurrency(Math.abs(delta))} 🎉`, type: 'win' });
      if (Math.abs(delta) > 500) {
        setShowParticles(true);
        setTimeout(() => setShowParticles(false), 2500);
      }
    } else if (delta < 0) {
      setTotalLosses(l => l + 1);
      setToast({ message: `-${formatCurrency(Math.abs(delta))}`, type: 'lose' });
    }
  }, []);

  const openGame = (g: GameType) => {
    haptic.medium();
    sound.playClick();
    setActiveGame(g);
  };

  const closeGame = () => {
    haptic.light();
    setActiveGame(null);
  };

  const progressPct = Math.min((balance / TARGET_AMOUNT) * 100, 100);

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ background: '#000', maxWidth: 430, margin: '0 auto' }}
    >
      {/* ── TOP STATUS BAR ── */}
      <div
        className="flex items-center justify-between px-5 pt-12 pb-3"
        style={{ background: 'rgba(0,0,0,0.9)' }}
      >
        <div className="flex flex-col">
          <span className="text-white/30 text-[10px] tracking-widest uppercase">Balance</span>
          <span
            className="font-black text-lg leading-tight"
            style={{
              background: 'linear-gradient(135deg, #22c55e, #86efac)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {formatCurrency(balance)}
          </span>
        </div>

        {/* Progress pill */}
        <div
          className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center gap-1.5">
            <div className="h-1 w-20 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #22c55e, #FFD700)' }}
              />
            </div>
            <span className="text-white/30 text-[9px]">$10M</span>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-white/30 text-[10px] tracking-widest uppercase">Streak</span>
          <div className="flex items-center gap-1">
            <span className="text-base">🔥</span>
            <span className="font-black text-lg text-orange-400 leading-tight">{streak}</span>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ paddingBottom: 100 }}
      >
        {/* GAMES TAB */}
        {tab === 'games' && (
          <div className="flex flex-col gap-3 px-4 pt-4">
            <div className="text-white/20 text-xs tracking-widest uppercase px-1 mb-1">Pick a Game</div>
            {GAMES.map(g => (
              <motion.button
                key={g.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => openGame(g.id)}
                className="w-full rounded-3xl p-5 flex items-center gap-4 text-left"
                style={{
                  background: g.bg,
                  border: `1px solid ${g.border}`,
                  boxShadow: `0 4px 24px ${g.glow}`,
                }}
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
                  style={{
                    background: `rgba(255,255,255,0.06)`,
                    border: `1px solid ${g.border}`,
                  }}
                >
                  {g.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-black text-white text-base">{g.label}</div>
                  <div className="text-white/40 text-xs mt-0.5 truncate">{g.sub}</div>
                </div>
                <div
                  className="text-sm font-bold flex-shrink-0"
                  style={{ color: g.color }}
                >
                  ›
                </div>
              </motion.button>
            ))}

            {/* Balance reset if broke */}
            {balance < 10 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-4 text-center"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}
              >
                <div className="text-red-400 font-bold text-sm mb-2">You're broke 💀</div>
                <button
                  onClick={() => {
                    setBalance(1000);
                    haptic.success();
                    setToast({ message: '+$1,000 — Back in the game!', type: 'info' });
                  }}
                  className="px-6 py-2 rounded-xl font-bold text-sm text-white"
                  style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)' }}
                >
                  Respawn ($1,000)
                </button>
              </motion.div>
            )}
          </div>
        )}

        {/* STATS TAB */}
        {tab === 'stats' && (
          <StatsScreen
            balance={balance}
            streak={streak}
            totalWins={totalWins}
            totalLosses={totalLosses}
          />
        )}
      </div>

      {/* ── iOS LIQUID GLASS BOTTOM BAR ── */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full"
        style={{ maxWidth: 430, paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
      >
        <div className="mx-4 mb-3">
          <div
            className="rounded-[28px] px-2 py-2 flex items-center justify-around"
            style={{
              background: 'rgba(28, 28, 30, 0.82)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 1px 0 rgba(255,255,255,0.06) inset, 0 -1px 0 rgba(0,0,0,0.4) inset',
            }}
          >
            {/* Balance chip */}
            <div
              className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-[20px] transition-all"
              style={{
                background: 'rgba(34,197,94,0.12)',
                border: '1px solid rgba(34,197,94,0.2)',
              }}
            >
              <span
                className="font-black text-sm leading-tight"
                style={{
                  background: 'linear-gradient(135deg, #22c55e, #86efac)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {formatCurrency(balance)}
              </span>
              <span className="text-white/30 text-[9px] tracking-widest uppercase">Balance</span>
            </div>

            {/* Games tab */}
            <button
              onClick={() => { setTab('games'); haptic.light(); }}
              className="flex flex-col items-center gap-1 px-5 py-2 rounded-[20px] transition-all"
              style={{
                background: tab === 'games' ? 'rgba(255,255,255,0.12)' : 'transparent',
                border: tab === 'games' ? '1px solid rgba(255,255,255,0.15)' : '1px solid transparent',
              }}
            >
              <span className="text-xl">🎮</span>
              <span
                className="text-[10px] font-semibold tracking-wide"
                style={{ color: tab === 'games' ? 'white' : 'rgba(255,255,255,0.4)' }}
              >
                Games
              </span>
            </button>

            {/* Stats tab */}
            <button
              onClick={() => { setTab('stats'); haptic.light(); }}
              className="flex flex-col items-center gap-1 px-5 py-2 rounded-[20px] transition-all"
              style={{
                background: tab === 'stats' ? 'rgba(255,255,255,0.12)' : 'transparent',
                border: tab === 'stats' ? '1px solid rgba(255,255,255,0.15)' : '1px solid transparent',
              }}
            >
              <span className="text-xl">📊</span>
              <span
                className="text-[10px] font-semibold tracking-wide"
                style={{ color: tab === 'stats' ? 'white' : 'rgba(255,255,255,0.4)' }}
              >
                Stats
              </span>
            </button>

            {/* Streak chip */}
            <div
              className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-[20px]"
              style={{
                background: 'rgba(255,107,0,0.12)',
                border: '1px solid rgba(255,107,0,0.2)',
              }}
            >
              <div className="flex items-center gap-1">
                <span className="text-sm">🔥</span>
                <span className="font-black text-sm text-orange-400 leading-tight">{streak}</span>
              </div>
              <span className="text-white/30 text-[9px] tracking-widest uppercase">Streak</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── GAME MODAL ── */}
      <GameModal
        game={activeGame}
        balance={balance}
        onClose={closeGame}
        onResult={handleResult}
      />

      {/* ── GLOBAL PARTICLES ── */}
      <ParticleEffect active={showParticles} />

      {/* ── TOAST ── */}
      <AnimatePresence>
        {toast && (
          <Toast
            key={toast.message + Date.now()}
            message={toast.message}
            type={toast.type}
            onDone={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
