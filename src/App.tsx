// ============================================================
// DOPAMINE BOX 📦
// The world's most addictive app — React edition
// Based on Jaxon Poulton's "I Built the World's Most Addictive App"
//
// Features:
// - Infinite scrolling dopamine feed with swipe acceleration
// - 4 mini-games: Coin Flip, Higher/Lower, Plinko, Flappy Coins
// - In-game currency with $10M target
// - Daily streak system (fear-of-breaking mechanic)
// - Particle effects, haptics, sound effects
// - Heavy dopamine UI with iOS-inspired design
// ============================================================

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { loadFromStorage, saveToStorage, formatCurrency, haptic, sound, TARGET_AMOUNT } from './store/gameStore';
import InfiniteFeed from './components/InfiniteFeed';
import GameModal from './components/GameModal';
import ParticleEffect from './components/ParticleEffect';
import RewardPopup from './components/RewardPopup';

// ============================================================
// Splash Screen
// ============================================================
const SplashScreen: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.4 }}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #0a1a0a 100%)',
        zIndex: 99999,
      }}
    >
      {/* Animated background particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: ['#FFD700', '#FF6B6B', '#00FF94', '#00B4D8', '#A78BFA'][i % 5],
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [-20, 20, -20],
            opacity: [0.3, 0.8, 0.3],
            scale: [0.5, 1.5, 0.5],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}

      {/* Logo */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 15, stiffness: 150, delay: 0.1 }}
        style={{
          width: 100,
          height: 100,
          borderRadius: 28,
          background: 'linear-gradient(135deg, #FFD700, #FF8C00)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 54,
          boxShadow: '0 0 60px rgba(255,215,0,0.5), 0 20px 60px rgba(0,0,0,0.5)',
          marginBottom: 20,
        }}
      >
        📦
      </motion.div>

      {/* App name */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        style={{
          fontSize: 36,
          fontWeight: 900,
          color: 'white',
          fontFamily: 'Inter, sans-serif',
          textAlign: 'center',
        }}
      >
        Dopamine Box
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        style={{
          fontSize: 14,
          color: 'rgba(255,255,255,0.5)',
          fontFamily: 'Inter, sans-serif',
          marginTop: 6,
          letterSpacing: 2,
          textTransform: 'uppercase',
        }}
      >
        The Most Addictive App
      </motion.div>

      {/* Loading dots */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        style={{ display: 'flex', gap: 8, marginTop: 40 }}
      >
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#FFD700',
            }}
          />
        ))}
      </motion.div>
    </motion.div>
  );
};

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
    win: { bg: 'linear-gradient(135deg, #00FF94, #00B4D8)', color: '#000' },
    lose: { bg: 'linear-gradient(135deg, #FF4757, #FF6B6B)', color: '#fff' },
    info: { bg: 'linear-gradient(135deg, #FFD700, #FF8C00)', color: '#000' },
  };

  return (
    <motion.div
      initial={{ y: -100, opacity: 0, scale: 0.8 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -100, opacity: 0, scale: 0.8 }}
      style={{
        position: 'fixed',
        top: 60,
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
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
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
        <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.6)', fontWeight: 700, fontFamily: 'Inter, sans-serif', letterSpacing: 2, textTransform: 'uppercase' }}>
          YOUR BALANCE
        </div>
        <div style={{ fontSize: 48, fontWeight: 900, color: '#000', fontFamily: 'Inter, sans-serif', lineHeight: 1.1, marginTop: 4 }}>
          {formatCurrency(balance)}
        </div>
        <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.5)', fontFamily: 'Inter, sans-serif', marginTop: 4 }}>
          Goal: $10,000,000.00
        </div>
        {/* Progress bar */}
        <div style={{ marginTop: 12, height: 8, background: 'rgba(0,0,0,0.2)', borderRadius: 4, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (balance / TARGET_AMOUNT) * 100)}%` }}
            style={{ height: '100%', background: '#000', borderRadius: 4 }}
          />
        </div>
        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)', marginTop: 4, fontFamily: 'Inter, sans-serif' }}>
          {((balance / TARGET_AMOUNT) * 100).toFixed(6)}% complete
        </div>
      </motion.div>

      {/* Streak card */}
      <motion.div
        animate={{ boxShadow: ['0 4px 20px rgba(255,140,0,0.2)', '0 4px 30px rgba(255,140,0,0.5)', '0 4px 20px rgba(255,140,0,0.2)'] }}
        transition={{ repeat: Infinity, duration: 2 }}
        style={{
          background: 'linear-gradient(135deg, #FF8C00, #FFD700)',
          borderRadius: 20,
          padding: '20px 24px',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div style={{ fontSize: 48 }}>🔥</div>
        <div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#000', fontFamily: 'Inter, sans-serif' }}>
            {streak} Days
          </div>
          <div style={{ fontSize: 14, color: 'rgba(0,0,0,0.7)', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
            Daily Streak — Don't break it! ⚠️
          </div>
        </div>
      </motion.div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        {[
          { label: '🏆 Total Wins', value: totalWins.toString(), color: '#00FF94' },
          { label: '💀 Total Losses', value: totalLosses.toString(), color: '#FF4757' },
          { label: '📊 Win Rate', value: `${winRate}%`, color: '#FFD700' },
          { label: '🎮 Games Played', value: (totalWins + totalLosses).toString(), color: '#A78BFA' },
        ].map(stat => (
          <div
            key={stat.label}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 16,
              padding: '16px 14px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 900, color: stat.color, fontFamily: 'Inter, sans-serif' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter, sans-serif', marginTop: 4 }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Motivational message */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: '16px',
        textAlign: 'center',
      }}>
        {balance >= TARGET_AMOUNT ? (
          <>
            <div style={{ fontSize: 40 }}>🎊</div>
            <div style={{ color: '#FFD700', fontWeight: 900, fontSize: 20, fontFamily: 'Inter, sans-serif' }}>
              YOU DID IT! $10 MILLION!
            </div>
          </>
        ) : balance >= 1_000_000 ? (
          <>
            <div style={{ fontSize: 32 }}>🚀</div>
            <div style={{ color: '#00FF94', fontWeight: 700, fontSize: 15, fontFamily: 'Inter, sans-serif' }}>
              Millionaire! Only {formatCurrency(TARGET_AMOUNT - balance)} to go!
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 32 }}>💪</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: 14, fontFamily: 'Inter, sans-serif' }}>
              Keep grinding! {formatCurrency(TARGET_AMOUNT - balance)} away from $10M!
            </div>
          </>
        )}
      </div>

      {/* Danger zone */}
      {balance < 100 && (
        <motion.div
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
          style={{
            marginTop: 12,
            background: 'linear-gradient(135deg, #FF4757, #FF6B6B)',
            borderRadius: 16,
            padding: '16px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 28 }}>⚠️</div>
          <div style={{ color: '#fff', fontWeight: 900, fontSize: 16, fontFamily: 'Inter, sans-serif' }}>
            LOW BALANCE! Only {formatCurrency(balance)} left!
          </div>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontFamily: 'Inter, sans-serif', marginTop: 4 }}>
            Collect free rewards from the feed!
          </div>
        </motion.div>
      )}
    </div>
  );
};

// ============================================================
// Games Gallery Screen
// ============================================================
const GamesScreen: React.FC<{
  balance: number;
  onGameSelect: (game: Exclude<GameType, null>) => void;
}> = ({ balance, onGameSelect }) => {
  const games = [
    {
      id: 'coinflip' as const,
      name: 'Coin Flip',
      emoji: '🪙',
      desc: 'Heads or tails — bet your coins, double or nothing!',
      gradient: 'linear-gradient(135deg, #FF6B6B, #FF8E53)',
      reward: '2x your bet',
      difficulty: 'Easy',
    },
    {
      id: 'higherlower' as const,
      name: 'Higher or Lower',
      emoji: '🃏',
      desc: 'Guess the next card — chain wins for massive multipliers!',
      gradient: 'linear-gradient(135deg, #667eea, #764ba2)',
      reward: 'Up to ∞x',
      difficulty: 'Medium',
    },
    {
      id: 'plinko' as const,
      name: 'Plinko',
      emoji: '🎯',
      desc: 'Drop the ball through pegs and land on multipliers!',
      gradient: 'linear-gradient(135deg, #FC5C7D, #6A3093)',
      reward: 'Up to 10x',
      difficulty: 'Luck',
    },
    {
      id: 'flappy' as const,
      name: 'Flappy Coins',
      emoji: '🐦',
      desc: 'Flap through coins to earn — WOOHOO on 5+ coins!',
      gradient: 'linear-gradient(135deg, #f7971e, #FFD700)',
      reward: 'Per coin',
      difficulty: 'Skill',
    },
  ];

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
      <div style={{
        color: 'white',
        fontSize: 28,
        fontWeight: 900,
        fontFamily: 'Inter, sans-serif',
        marginBottom: 4,
      }}>
        🎮 Mini Games
      </div>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 20, fontFamily: 'Inter, sans-serif' }}>
        Balance: <span style={{ color: '#FFD700', fontWeight: 700 }}>{formatCurrency(balance)}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {games.map((game, i) => (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => { haptic.medium(); sound.playClick(); onGameSelect(game.id); }}
            style={{
              background: game.gradient,
              borderRadius: 20,
              padding: '20px',
              cursor: 'pointer',
              boxShadow: '0 6px 24px rgba(0,0,0,0.2)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                background: 'rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 36,
                flexShrink: 0,
              }}>
                {game.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: 'white', fontFamily: 'Inter, sans-serif' }}>
                  {game.name}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontFamily: 'Inter, sans-serif', marginTop: 3 }}>
                  {game.desc}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: 20,
                    background: 'rgba(255,255,255,0.25)',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'white',
                    fontFamily: 'Inter, sans-serif',
                  }}>
                    💰 {game.reward}
                  </span>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: 20,
                    background: 'rgba(255,255,255,0.15)',
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.9)',
                    fontFamily: 'Inter, sans-serif',
                  }}>
                    {game.difficulty}
                  </span>
                </div>
              </div>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                color: 'white',
                flexShrink: 0,
              }}>
                →
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Motivation */}
      <div style={{ marginTop: 20, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 12, fontFamily: 'Inter, sans-serif', paddingBottom: 80 }}>
        Play daily to maximize your streak bonus! 🔥
      </div>
    </div>
  );
};

// ============================================================
// MAIN APP COMPONENT
// ============================================================
const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);

  // Load saved state
  const savedState = loadFromStorage();
  const [balance, setBalance] = useState(savedState.balance);
  const [streak] = useState(savedState.streak);
  const [totalWins, setTotalWins] = useState(savedState.totalWins);
  const [totalLosses, setTotalLosses] = useState(savedState.totalLosses);
  const [activeGame, setActiveGame] = useState<GameType>(null);
  const [activeTab, setActiveTab] = useState<TabType>('feed');
  const [toast, setToast] = useState<{ message: string; type: 'win' | 'lose' | 'info'; key: number } | null>(null);
  const [showParticles, setShowParticles] = useState(false);
  const [showMillionPopup, setShowMillionPopup] = useState(false);
  const prevBalanceRef = useRef(balance);
  const toastKey = useRef(0);

  // Save to storage whenever state changes
  useEffect(() => {
    saveToStorage(balance, streak, totalWins, totalLosses);
  }, [balance, streak, totalWins, totalLosses]);

  // Check for $10M milestone
  useEffect(() => {
    if (balance >= TARGET_AMOUNT && prevBalanceRef.current < TARGET_AMOUNT) {
      setShowMillionPopup(true);
      haptic.jackpot();
      sound.playJackpot();
      setShowParticles(true);
      setTimeout(() => setShowParticles(false), 5000);
    }
    prevBalanceRef.current = balance;
  }, [balance]);

  const showToast = useCallback((message: string, type: 'win' | 'lose' | 'info') => {
    toastKey.current++;
    setToast({ message, type, key: toastKey.current });
  }, []);

  const handleGameResult = useCallback((delta: number, won: boolean) => {
    setBalance(prev => Math.max(0, prev + delta));
    if (won) {
      setTotalWins(w => w + 1);
      showToast(`🎉 WIN! +${formatCurrency(Math.abs(delta))}`, 'win');
      if (delta > 500) {
        setShowParticles(true);
        setTimeout(() => setShowParticles(false), 2500);
      }
    } else {
      setTotalLosses(l => l + 1);
      showToast(`💀 LOST ${formatCurrency(Math.abs(delta))}`, 'lose');
    }
  }, [showToast]);

  const handleCollectReward = useCallback((amount: number) => {
    setBalance(prev => prev + amount);
    showToast(`💰 Collected ${formatCurrency(amount)}!`, 'info');
    haptic.success();
    sound.playCoin();
  }, [showToast]);

  const handleGameSelect = useCallback((game: Exclude<GameType, null>) => {
    setActiveGame(game);
    haptic.medium();
  }, []);

  const handleGameClose = useCallback(() => {
    setActiveGame(null);
    haptic.light();
  }, []);

  const tabs: { id: TabType; emoji: string; label: string }[] = [
    { id: 'feed', emoji: '🏠', label: 'Feed' },
    { id: 'games', emoji: '🎮', label: 'Games' },
    { id: 'stats', emoji: '📊', label: 'Stats' },
  ];

  return (
    <div style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(180deg, #0a0a1a 0%, #111122 100%)',
      color: 'white',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      overflow: 'hidden',
      maxWidth: 480,
      margin: '0 auto',
      position: 'relative',
    }}>
      {/* Splash Screen */}
      <AnimatePresence>
        {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      </AnimatePresence>

      {/* ====== STATUS BAR ====== */}
      <div style={{
        padding: '12px 16px 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(0,0,0,0.3)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
        zIndex: 10,
      }}>
        {/* App logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #FFD700, #FF8C00)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            boxShadow: '0 2px 8px rgba(255,215,0,0.3)',
          }}>
            📦
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16, lineHeight: 1, color: '#fff' }}>
              Dopamine Box
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', lineHeight: 1, marginTop: 1 }}>
              {streak} 🔥 streak
            </div>
          </div>
        </div>

        {/* Balance display */}
        <motion.div
          key={balance}
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          style={{
            textAlign: 'right',
          }}
        >
          <div style={{
            fontWeight: 900,
            fontSize: 20,
            color: balance > 0 ? '#00FF94' : '#FF4757',
            fontFamily: 'Inter, sans-serif',
            textShadow: balance > 0 ? '0 0 12px rgba(0,255,148,0.4)' : 'none',
          }}>
            {formatCurrency(balance)}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textAlign: 'right' }}>
            of $10M goal
          </div>
        </motion.div>
      </div>

      {/* ====== MAIN CONTENT ====== */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <AnimatePresence mode="wait">
          {activeTab === 'feed' && (
            <motion.div
              key="feed"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            >
              <InfiniteFeed
                balance={balance}
                streak={streak}
                onGameSelect={handleGameSelect}
                onCollectReward={handleCollectReward}
              />
            </motion.div>
          )}

          {activeTab === 'games' && (
            <motion.div
              key="games"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            >
              <GamesScreen balance={balance} onGameSelect={handleGameSelect} />
            </motion.div>
          )}

          {activeTab === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            >
              <StatsScreen
                balance={balance}
                streak={streak}
                totalWins={totalWins}
                totalLosses={totalLosses}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ====== BOTTOM TAB BAR ====== */}
      <div style={{
        display: 'flex',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        flexShrink: 0,
        zIndex: 50,
      }}>
        {tabs.map((tab) => (
          <motion.button
            key={tab.id}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              setActiveTab(tab.id);
              haptic.light();
              sound.playClick();
            }}
            style={{
              flex: 1,
              padding: '10px 0 8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
            }}
          >
            <span style={{ fontSize: 22, filter: activeTab === tab.id ? 'none' : 'grayscale(60%)' }}>
              {tab.emoji}
            </span>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: activeTab === tab.id ? '#FFD700' : 'rgba(255,255,255,0.4)',
              fontFamily: 'Inter, sans-serif',
            }}>
              {tab.label}
            </span>
            {activeTab === tab.id && (
              <motion.div
                layoutId="tab-indicator"
                style={{
                  position: 'absolute',
                  bottom: 0,
                  width: 24,
                  height: 3,
                  borderRadius: 2,
                  background: '#FFD700',
                }}
              />
            )}
          </motion.button>
        ))}
      </div>

      {/* ====== GAME MODAL ====== */}
      <GameModal
        game={activeGame}
        balance={balance}
        onClose={handleGameClose}
        onResult={handleGameResult}
      />

      {/* ====== TOAST ====== */}
      <AnimatePresence>
        {toast && (
          <Toast
            key={toast.key}
            message={toast.message}
            type={toast.type}
            onDone={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      {/* ====== PARTICLES ====== */}
      <ParticleEffect active={showParticles} count={120} />

      {/* ====== $10M POPUP ====== */}
      <AnimatePresence>
        {showMillionPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(0,0,0,0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
            }}
            onClick={() => setShowMillionPopup(false)}
          >
            <motion.div
              initial={{ scale: 0.5, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              style={{
                background: 'linear-gradient(135deg, #FFD700, #FF8C00)',
                borderRadius: 32,
                padding: '40px 32px',
                textAlign: 'center',
                maxWidth: 340,
                boxShadow: '0 0 80px rgba(255,215,0,0.5)',
              }}
            >
              <div style={{ fontSize: 64 }}>🎊</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#000', fontFamily: 'Inter, sans-serif', marginTop: 8 }}>
                YOU DID IT!
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'rgba(0,0,0,0.7)', fontFamily: 'Inter, sans-serif', marginTop: 4 }}>
                $10,000,000 REACHED!
              </div>
              <div style={{ fontSize: 14, color: 'rgba(0,0,0,0.6)', fontFamily: 'Inter, sans-serif', marginTop: 8 }}>
                You've beaten Dopamine Box! 🏆
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowMillionPopup(false)}
                style={{
                  marginTop: 20,
                  padding: '14px 32px',
                  borderRadius: 50,
                  background: '#000',
                  color: '#FFD700',
                  fontWeight: 900,
                  fontSize: 16,
                  fontFamily: 'Inter, sans-serif',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Keep Playing!
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global styles */}
      <style>{`
        * {
          box-sizing: border-box;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        ::-webkit-scrollbar { display: none; }
        scrollbar-width: none;
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default App;
