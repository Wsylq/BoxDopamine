import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getState,
  subscribe,
  formatCurrency,
  resetBalance,
  sounds,
  haptics,
} from './store/gameStore';
import type { GameId } from './store/gameStore';
import InfiniteFeed from './components/InfiniteFeed';
import GameModal from './components/GameModal';
import ParticleEffect from './components/ParticleEffect';

type Tab = 'feed' | 'stats';

const GOAL = 10_000_000;

// ── Stat row ────────────────────────────────────────────────────
function StatRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between py-3"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span className="text-white/50 text-sm">{label}</span>
      <span className="font-bold text-base" style={{ color: accent ?? '#fff' }}>{value}</span>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>('feed');
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const [gameState, setGameState] = useState(getState());
  const [showParticles, setShowParticles] = useState(false);
  const [balancePulse, setBalancePulse] = useState(false);

  // Subscribe to store changes
  useEffect(() => {
    const unsub = subscribe(() => {
      const prev = gameState.balance;
      const next = getState().balance;
      setGameState(getState());
      if (next > prev) {
        setBalancePulse(true);
        setTimeout(() => setBalancePulse(false), 500);
        if (next - prev >= 500) {
          setShowParticles(true);
          setTimeout(() => setShowParticles(false), 2000);
        }
      }
    });
    return () => { unsub(); };
  }, [gameState.balance]);

  const openGame = useCallback((id: GameId) => {
    setActiveGame(id);
    sounds.click();
    haptics.medium();
  }, []);

  const closeGame = useCallback(() => {
    setActiveGame(null);
    sounds.swoosh();
  }, []);

  const { balance, streak, totalWins, totalLosses, biggestWin } = gameState;
  const goalPct = Math.min(100, (balance / GOAL) * 100);

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: '#000', maxWidth: 430, margin: '0 auto' }}>
      {/* Particles */}
      {showParticles && <ParticleEffect active={showParticles} originX={0.5} originY={0.15} />}

      {/* ── TOP BAR ────────────────────────────────────────────── */}
      <div
        className="shrink-0 flex items-center justify-between px-5 pt-14 pb-4"
        style={{
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
            style={{
              background: 'linear-gradient(135deg, #FF6B6B, #FFD700)',
              boxShadow: '0 0 16px rgba(255,107,107,0.4)',
            }}
          >
            🎰
          </div>
          <div>
            <div className="text-white font-black text-base leading-none">Dopamine</div>
            <div className="text-white/40 text-xs leading-none mt-0.5">Box</div>
          </div>
        </div>

        {/* Balance chip */}
        <motion.div
          animate={balancePulse ? { scale: [1, 1.12, 1] } : { scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center"
        >
          <div
            className="px-4 py-1.5 rounded-2xl flex items-center gap-1.5"
            style={{
              background: 'rgba(255,215,0,0.12)',
              border: '1px solid rgba(255,215,0,0.3)',
              boxShadow: balancePulse ? '0 0 20px rgba(255,215,0,0.5)' : 'none',
            }}
          >
            <span className="text-yellow-400 text-lg">💰</span>
            <span className="font-black text-white text-base">{formatCurrency(balance)}</span>
          </div>
        </motion.div>

        {/* Streak chip */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl"
          style={{
            background: 'rgba(255,107,107,0.12)',
            border: '1px solid rgba(255,107,107,0.25)',
          }}
        >
          <span className="text-base">🔥</span>
          <span className="font-black text-white text-base">{streak}</span>
          <span className="text-white/40 text-xs">day{streak !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* ── CONTENT AREA ───────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {tab === 'feed' && (
            <motion.div
              key="feed"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 overflow-y-auto scroll-view"
            >
              <InfiniteFeed onGameOpen={openGame} />
            </motion.div>
          )}

          {tab === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 overflow-y-auto scroll-view px-5 py-6"
            >
              {/* Goal card */}
              <div
                className="rounded-3xl p-5 mb-5"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,215,0,0.12), rgba(255,140,0,0.06))',
                  border: '1px solid rgba(255,215,0,0.2)',
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-4xl">🏆</span>
                  <div>
                    <div className="text-white font-black text-xl">$10 Million Goal</div>
                    <div className="text-yellow-400 text-base font-bold">{goalPct.toFixed(3)}% there</div>
                  </div>
                </div>
                <div className="h-4 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(goalPct, 0.3)}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, #FFD700, #FF8C00)' }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-white/40">
                  <span>{formatCurrency(balance)}</span>
                  <span>$10,000,000</span>
                </div>
              </div>

              {/* Stats list */}
              <div
                className="rounded-3xl px-5 py-2 mb-5"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <StatRow label="💰 Balance" value={formatCurrency(balance)} accent="#FFD700" />
                <StatRow label="🔥 Day Streak" value={`${streak} days`} accent="#FF6B6B" />
                <StatRow label="✅ Total Wins" value={`${totalWins}`} accent="#22c55e" />
                <StatRow label="❌ Total Losses" value={`${totalLosses}`} accent="#ef4444" />
                <StatRow
                  label="📊 Win Rate"
                  value={totalWins + totalLosses > 0
                    ? `${((totalWins / (totalWins + totalLosses)) * 100).toFixed(1)}%`
                    : 'N/A'}
                  accent="#60a5fa"
                />
                <StatRow label="🎰 Biggest Win" value={formatCurrency(biggestWin)} accent="#a78bfa" />
              </div>

              {/* Games quick-access */}
              <div className="mb-5">
                <div className="text-white/50 text-xs uppercase tracking-wider font-semibold mb-3">Quick Play</div>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { id: 'coinflip' as GameId, emoji: '🪙', label: 'Coin Flip', color: '#FF6B6B' },
                    { id: 'higherlower' as GameId, emoji: '🃏', label: 'Hi/Lo', color: '#a78bfa' },
                    { id: 'plinko' as GameId, emoji: '🎯', label: 'Plinko', color: '#00FF94' },
                    { id: 'flappy' as GameId, emoji: '🐦', label: 'Flappy', color: '#FFD700' },
                  ]).map(g => (
                    <motion.button
                      key={g.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => openGame(g.id)}
                      className="flex flex-col items-center gap-2 p-4 rounded-3xl"
                      style={{
                        background: `${g.color}12`,
                        border: `1px solid ${g.color}30`,
                        boxShadow: `0 4px 16px ${g.color}12`,
                      }}
                    >
                      <div className="text-3xl">{g.emoji}</div>
                      <div className="text-white text-sm font-bold">{g.label}</div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Danger zone */}
              {balance < 10 && (
                <div
                  className="rounded-3xl p-5 mb-5 text-center"
                  style={{
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.25)',
                  }}
                >
                  <div className="text-3xl mb-2">💀</div>
                  <div className="text-red-400 font-black text-lg mb-3">You're broke!</div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { resetBalance(); sounds.reward(); haptics.win(); }}
                    className="px-6 py-3 rounded-2xl font-bold text-black"
                    style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}
                  >
                    💸 Restart with $1,000
                  </motion.button>
                </div>
              )}

              {/* Psychological disclaimer */}
              <div className="text-center text-white/20 text-xs pb-8 px-4">
                ⚠️ This is a satirical educational app simulating dopamine-loop mechanics.
                Not real money. Gamble responsibly IRL.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── LIQUID GLASS TAB BAR ───────────────────────────────── */}
      <div
        className="shrink-0 flex items-center justify-around px-6 pb-8 pt-3"
        style={{
          background: 'rgba(10,10,15,0.7)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {([
          { id: 'feed' as Tab, label: 'Feed', icon: '🎰' },
          { id: 'stats' as Tab, label: 'Stats', icon: '📊' },
        ] as { id: Tab; label: string; icon: string }[]).map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); haptics.light(); sounds.click(); }}
            className="flex flex-col items-center gap-1 relative"
            style={{ minWidth: 72 }}
          >
            <div
              className="w-14 h-10 rounded-2xl flex items-center justify-center text-2xl transition-all"
              style={{
                background: tab === t.id
                  ? 'rgba(255,255,255,0.12)'
                  : 'transparent',
                transform: tab === t.id ? 'scale(1.08)' : 'scale(1)',
              }}
            >
              {t.icon}
            </div>
            <span
              className="text-xs font-semibold transition-all"
              style={{ color: tab === t.id ? '#fff' : 'rgba(255,255,255,0.35)' }}
            >
              {t.label}
            </span>
            {tab === t.id && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute -bottom-1 w-1 h-1 rounded-full"
                style={{ background: '#fff' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Game Modal */}
      <GameModal game={activeGame} onClose={closeGame} />
    </div>
  );
}
