// ============================================================
// DOPAMINE BOX 📦
// The world's most addictive app — React edition
// Game pops up immediately on launch, feed is behind it
// ============================================================

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { loadFromStorage, saveToStorage, formatCurrency, haptic, sound, TARGET_AMOUNT } from './store/gameStore';
import InfiniteFeed from './components/InfiniteFeed';
import GameModal from './components/GameModal';
import ParticleEffect from './components/ParticleEffect';
import RewardPopup from './components/RewardPopup';

type GameType = 'coinflip' | 'higherlower' | 'plinko' | 'flappy' | null;
type TabType = 'feed' | 'games' | 'stats';

// ============================================================
// WIN/LOSE Toast Notification
// ============================================================
const Toast: React.FC<{ message: string; type: 'win' | 'lose' | 'info'; onDone: () => void }> = ({ message, type, onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);

  const colors = {
    win: { bg: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff' },
    lose: { bg: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff' },
    info: { bg: 'linear-gradient(135deg, #FFD700, #FF8C00)', color: '#000' },
  };

  return (
    <motion.div
      initial={{ y: -80, opacity: 0, scale: 0.8 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -80, opacity: 0, scale: 0.8 }}
      style={{
        position: 'fixed',
        top: 52,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9998,
        padding: '12px 24px',
        borderRadius: 50,
        background: colors[type].bg,
        color: colors[type].color,
        fontWeight: 900,
        fontSize: 16,
        fontFamily: 'Inter, sans-serif',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        whiteSpace: 'nowrap',
        maxWidth: '90vw',
      }}
    >
      {message}
    </motion.div>
  );
};

// ============================================================
// Stats Screen
// ============================================================
const StatsScreen: React.FC<{
  balance: number;
  streak: number;
  totalWins: number;
  totalLosses: number;
}> = ({ balance, streak, totalWins, totalLosses }) => {
  const winRate = totalWins + totalLosses > 0
    ? ((totalWins / (totalWins + totalLosses)) * 100).toFixed(1)
    : '0.0';

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
      {/* Balance hero */}
      <motion.div
        animate={{ scale: [1, 1.005, 1] }}
        transition={{ repeat: Infinity, duration: 3 }}
        style={{
          background: 'linear-gradient(135deg, #FFD700, #FF8C00)',
          borderRadius: 24,
          padding: '28px 24px',
          textAlign: 'center',
          marginBottom: 16,
          boxShadow: '0 8px 32px rgba(255,215,0,0.3)',
        }}
      >
        <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.6)', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>
          YOUR BALANCE
        </div>
        <div style={{ fontSize: 48, fontWeight: 900, color: '#000', lineHeight: 1.1, marginTop: 4 }}>
          {formatCurrency(balance)}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.5)', marginTop: 4 }}>
          Goal: $10,000,000.00
        </div>
        <div style={{ marginTop: 12, height: 8, background: 'rgba(0,0,0,0.2)', borderRadius: 4, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (balance / TARGET_AMOUNT) * 100)}%` }}
            transition={{ duration: 1 }}
            style={{ height: '100%', background: '#000', borderRadius: 4 }}
          />
        </div>
        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.4)', marginTop: 6 }}>
          {((balance / TARGET_AMOUNT) * 100).toFixed(4)}% to goal
        </div>
      </motion.div>

      {/* Streak card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(255,140,0,0.2), rgba(255,215,0,0.1))',
        borderRadius: 20,
        padding: '20px',
        border: '1px solid rgba(255,140,0,0.3)',
        marginBottom: 12,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 48 }}>🔥</div>
        <div style={{ fontSize: 36, fontWeight: 900, color: '#FFD700' }}>{streak}</div>
        <div style={{ fontSize: 14, color: '#888' }}>Day Streak</div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        {[
          { label: 'Total Wins', value: totalWins, color: '#4ade80', emoji: '✅' },
          { label: 'Total Losses', value: totalLosses, color: '#ef4444', emoji: '❌' },
          { label: 'Win Rate', value: `${winRate}%`, color: '#60a5fa', emoji: '📊' },
          { label: 'Games Played', value: totalWins + totalLosses, color: '#a78bfa', emoji: '🎮' },
        ].map((s, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 16,
            padding: '16px',
            border: `1px solid ${s.color}33`,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 24 }}>{s.emoji}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// Games Screen
// ============================================================
const GamesScreen: React.FC<{ onGameSelect: (game: NonNullable<GameType>) => void }> = ({ onGameSelect }) => {
  const games = [
    { emoji: '🃏', title: 'Higher or Lower', desc: 'Chain wins for huge multipliers!', game: 'higherlower' as const, color: '#a78bfa', bg: '#1a0030' },
    { emoji: '🪙', title: 'Coin Flip', desc: 'Classic double-or-nothing', game: 'coinflip' as const, color: '#FF6B6B', bg: '#1a0a00' },
    { emoji: '🎯', title: 'Plinko', desc: 'Drop the ball, win big', game: 'plinko' as const, color: '#4ade80', bg: '#001a0a' },
    { emoji: '🐦', title: 'Flappy Coins', desc: 'Collect coins, earn rewards', game: 'flappy' as const, color: '#FFD700', bg: '#0f0c29' },
  ];

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
      <div style={{ fontSize: 13, color: '#666', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12, fontWeight: 700 }}>
        Choose a Game
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {games.map((g, i) => (
          <motion.button
            key={g.game}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
            onClick={() => { haptic.medium(); sound.playClick(); onGameSelect(g.game); }}
            style={{
              background: `linear-gradient(135deg, ${g.bg}, rgba(255,255,255,0.03))`,
              borderRadius: 20,
              padding: '20px 18px',
              border: `1px solid ${g.color}44`,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            <div style={{
              width: 60, height: 60, borderRadius: 18,
              background: `${g.color}22`,
              border: `1px solid ${g.color}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 30, flexShrink: 0,
            }}>
              {g.emoji}
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 900, color: '#fff', marginBottom: 4 }}>{g.title}</div>
              <div style={{ fontSize: 13, color: `${g.color}cc` }}>{g.desc}</div>
            </div>
            <div style={{ marginLeft: 'auto', color: g.color, fontSize: 18 }}>→</div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [balance, setBalance] = useState(1000);
  const [streak, setStreak] = useState(1);
  const [totalWins, setTotalWins] = useState(0);
  const [totalLosses, setTotalLosses] = useState(0);
  const [activeGame, setActiveGame] = useState<GameType>(null);
  const [tab, setTab] = useState<TabType>('feed');
  const [toast, setToast] = useState<{ message: string; type: 'win' | 'lose' | 'info' } | null>(null);
  const [showParticles, setShowParticles] = useState(false);
  const [rewardPopup, setRewardPopup] = useState<number | null>(null);

  // Load state from storage
  useEffect(() => {
    const data = loadFromStorage();
    setBalance(data.balance);
    setStreak(data.streak);
    setTotalWins(data.totalWins);
    setTotalLosses(data.totalLosses);
    setLoaded(true);

    // ✨ AUTO-LAUNCH Higher/Lower game immediately on app open
    setTimeout(() => {
      setActiveGame('higherlower');
    }, 300);
  }, []);

  const showToast = (message: string, type: 'win' | 'lose' | 'info') => {
    setToast({ message, type });
  };

  const handleGameResult = useCallback((delta: number, won: boolean) => {
    setBalance(prev => {
      const newBalance = Math.max(0, prev + delta);
      const newWins = won ? totalWins + 1 : totalWins;
      const newLosses = won ? totalLosses : totalLosses + 1;

      if (won) {
        setTotalWins(w => w + 1);
        showToast(`🎉 +${formatCurrency(Math.abs(delta))}`, 'win');
        if (Math.abs(delta) > 200) {
          setShowParticles(true);
          setTimeout(() => setShowParticles(false), 2500);
        }
      } else {
        setTotalLosses(l => l + 1);
        showToast(`💀 -${formatCurrency(Math.abs(delta))}`, 'lose');
      }

      saveToStorage(newBalance, streak, newWins, newLosses);
      return newBalance;
    });
  }, [streak, totalWins, totalLosses]);

  const handleCollectReward = useCallback((amount: number) => {
    setBalance(prev => {
      const newBalance = prev + amount;
      saveToStorage(newBalance, streak, totalWins, totalLosses);
      return newBalance;
    });
    setRewardPopup(amount);
    showToast(`💰 +${formatCurrency(amount)} collected!`, 'info');
  }, [streak, totalWins, totalLosses]);

  const handleOpenGame = (game: NonNullable<GameType>) => {
    haptic.medium();
    sound.playClick();
    setActiveGame(game);
  };

  const handleCloseGame = () => {
    setActiveGame(null);
  };

  if (!loaded) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0a0a0a',
      }}>
        <div style={{ fontSize: 48 }}>📦</div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#0a0a0a',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      color: '#fff',
      overflow: 'hidden',
    }}>
      {/* ── TOP STATUS BAR ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 18px 8px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 22 }}>📦</span>
          <div>
            <div style={{ fontSize: 11, color: '#555', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
              Balance
            </div>
            <motion.div
              key={balance}
              initial={{ scale: 1.15, color: '#4ade80' }}
              animate={{ scale: 1, color: '#FFD700' }}
              transition={{ duration: 0.4 }}
              style={{ fontSize: 18, fontWeight: 900 }}
            >
              {formatCurrency(balance)}
            </motion.div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 16 }}>🔥</span>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#FF8C00' }}>{streak}</div>
            <div style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: 1 }}>Streak</div>
          </div>
        </div>

        <div style={{
          background: 'rgba(255,215,0,0.1)',
          border: '1px solid rgba(255,215,0,0.3)',
          borderRadius: 10,
          padding: '4px 10px',
          fontSize: 11,
          color: '#FFD700',
          fontWeight: 700,
        }}>
          ${(TARGET_AMOUNT / 1_000_000).toFixed(0)}M GOAL
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'feed' && (
          <InfiniteFeed
            balance={balance}
            streak={streak}
            onGameSelect={handleOpenGame}
            onCollectReward={handleCollectReward}
          />
        )}
        {tab === 'games' && (
          <GamesScreen onGameSelect={handleOpenGame} />
        )}
        {tab === 'stats' && (
          <StatsScreen
            balance={balance}
            streak={streak}
            totalWins={totalWins}
            totalLosses={totalLosses}
          />
        )}
      </div>

      {/* ── BOTTOM TAB BAR ── */}
      <div style={{
        display: 'flex',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(10,10,10,0.95)',
        padding: '8px 0 16px',
        flexShrink: 0,
      }}>
        {([
          { id: 'feed', emoji: '📱', label: 'Feed' },
          { id: 'games', emoji: '🎮', label: 'Games' },
          { id: 'stats', emoji: '📊', label: 'Stats' },
        ] as { id: TabType; emoji: string; label: string }[]).map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); haptic.light(); }}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              color: tab === t.id ? '#FFD700' : '#444',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              padding: '6px 0',
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              transition: 'color 0.2s',
            }}
          >
            <span style={{ fontSize: 22 }}>{t.emoji}</span>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              {t.label}
            </span>
          </button>
        ))}
      </div>

      {/* ── GAME MODAL (full-screen) ── */}
      <GameModal
        game={activeGame}
        balance={balance}
        onClose={handleCloseGame}
        onResult={handleGameResult}
      />

      {/* ── GLOBAL PARTICLES ── */}
      <ParticleEffect active={showParticles} />

      {/* ── REWARD POPUP ── */}
      <RewardPopup amount={rewardPopup} onDone={() => setRewardPopup(null)} />

      {/* ── TOAST NOTIFICATIONS ── */}
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
