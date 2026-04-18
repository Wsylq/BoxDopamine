import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getState, subscribe, formatCurrency, sounds, haptics } from '../store/gameStore';
import type { GameId } from '../store/gameStore';
import CoinFlip from '../games/CoinFlip';
import HigherLower from '../games/HigherLower';
import Plinko from '../games/Plinko';
import FlappyCoins from '../games/FlappyCoins';
import ParticleEffect from './ParticleEffect';

// ── Game metadata ──────────────────────────────────────────────
const GAME_META: Record<GameId, { label: string; emoji: string; color: string; sub: string; gradient: string }> = {
  coinflip: {
    label: 'Coin Flip',
    emoji: '🪙',
    color: '#FFD700',
    sub: '50/50 · Win 2×',
    gradient: 'linear-gradient(135deg, rgba(255,107,107,0.18) 0%, rgba(255,140,0,0.12) 100%)',
  },
  higherlower: {
    label: 'Higher or Lower',
    emoji: '🃏',
    color: '#a78bfa',
    sub: 'Chain wins · Up to 64×',
    gradient: 'linear-gradient(135deg, rgba(167,139,250,0.18) 0%, rgba(124,58,237,0.12) 100%)',
  },
  plinko: {
    label: 'Plinko',
    emoji: '🎯',
    color: '#00FF94',
    sub: 'Physics drop · 0.2×–2.0×',
    gradient: 'linear-gradient(135deg, rgba(0,255,148,0.15) 0%, rgba(0,204,119,0.08) 100%)',
  },
  flappy: {
    label: 'Flappy Coins',
    emoji: '🐦',
    color: '#FFD700',
    sub: 'Collect coins · $5 each',
    gradient: 'linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(255,140,0,0.08) 100%)',
  },
};

// Generate a shuffled infinite sequence of games (no adjacent duplicates)
function pickNextGame(last?: GameId): GameId {
  const all: GameId[] = ['coinflip', 'higherlower', 'plinko', 'flappy'];
  const pool = last ? all.filter(g => g !== last) : all;
  return pool[Math.floor(Math.random() * pool.length)];
}

function generateGameList(count: number): GameId[] {
  const list: GameId[] = [];
  for (let i = 0; i < count; i++) {
    list.push(pickNextGame(list[list.length - 1]));
  }
  return list;
}

function GameComponent({ gameId }: { gameId: GameId }) {
  switch (gameId) {
    case 'coinflip': return <CoinFlip />;
    case 'higherlower': return <HigherLower />;
    case 'plinko': return <Plinko />;
    case 'flappy': return <FlappyCoins />;
  }
}

// ── Single game slide ──────────────────────────────────────────
function GameSlide({ gameId, isActive, isFirstEver }: { gameId: GameId; isActive: boolean; isFirstEver: boolean }) {
  const meta = GAME_META[gameId];
  const [started, setStarted] = useState(false);

  // When swiping to a new slide, reset started state
  useEffect(() => {
    if (!isActive) {
      setStarted(false);
    }
  }, [isActive]);

  return (
    <div
      className="w-full h-full flex flex-col relative overflow-hidden"
      style={{
        background: '#080810',
        transform: 'translate3d(0, 0, 0)',
      }}
    >
      {/* Game header pill */}
      <div
        className="shrink-0 flex items-center gap-3 px-4 pt-3 pb-2"
        style={{
          background: meta.gradient,
          borderBottom: `1px solid ${meta.color}22`,
          transform: 'translate3d(0, 0, 0)',
        }}
      >
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
          style={{
            background: `${meta.color}22`,
            border: `1px solid ${meta.color}44`,
            boxShadow: `0 0 12px ${meta.color}33`,
          }}
        >
          {meta.emoji}
        </div>
        <div className="flex-1">
          <div className="font-black text-white text-base leading-tight">{meta.label}</div>
          <div className="text-white/40 text-xs">{meta.sub}</div>
        </div>
        <div
          className="px-2 py-0.5 rounded-full text-xs font-bold"
          style={{ background: `${meta.color}22`, color: meta.color, border: `1px solid ${meta.color}44` }}
        >
          LIVE
        </div>
      </div>

      {/* Tap-to-start overlay (only show on first game ever) */}
      <AnimatePresence>
        {!started && isFirstEver && (
          <motion.div
            key="tap-overlay"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6"
            style={{
              background: 'rgba(0,0,0,0.82)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
            onClick={() => {
              setStarted(true);
              sounds.click();
              haptics.medium();
            }}
          >
            {/* Animated ring */}
            <div className="relative flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.15, 0.5] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute rounded-full"
                style={{
                  width: 120, height: 120,
                  border: `2px solid ${meta.color}`,
                }}
              />
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                className="w-24 h-24 rounded-full flex items-center justify-center text-5xl"
                style={{
                  background: `radial-gradient(circle, ${meta.color}33, ${meta.color}11)`,
                  border: `2px solid ${meta.color}66`,
                  boxShadow: `0 0 32px ${meta.color}44`,
                }}
              >
                {meta.emoji}
              </motion.div>
            </div>

            <div className="text-center">
              <div className="text-white font-black text-2xl">{meta.label}</div>
              <div className="text-white/50 text-sm mt-1">{meta.sub}</div>
            </div>

            <motion.div
              animate={{ opacity: [0.6, 1, 0.6], y: [0, -4, 0] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="flex flex-col items-center gap-1"
            >
              <div
                className="px-8 py-3 rounded-2xl font-black text-lg"
                style={{
                  background: `linear-gradient(135deg, ${meta.color}, ${meta.color}aa)`,
                  color: '#000',
                  boxShadow: `0 4px 24px ${meta.color}55`,
                }}
              >
                TAP TO PLAY
              </div>
              <div className="text-white/30 text-xs mt-1">↓ Swipe for next game</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game content */}
      <div className="flex-1 overflow-y-auto" style={{ 
        overscrollBehavior: 'contain',
        transform: 'translate3d(0, 0, 0)',
      }}>
        {isActive && <GameComponent gameId={gameId} />}
      </div>
    </div>
  );
}

// ── Main GameReel component ────────────────────────────────────
export default function GameReel() {
  const [games, setGames] = useState<GameId[]>(() => generateGameList(8));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startTimeRef = useRef(0);
  const rafRef = useRef<number>(0);

  // Balance + particles
  const [gameState, setGameState] = useState(getState());
  const [showParticles, setShowParticles] = useState(false);
  const [balancePulse, setBalancePulse] = useState(false);

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

  // Append more games when near end
  useEffect(() => {
    if (currentIndex >= games.length - 3) {
      setGames(prev => [...prev, ...generateGameList(6)]);
    }
  }, [currentIndex, games.length]);

  const goTo = useCallback((idx: number) => {
    if (idx < 0 || idx >= games.length || isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex(idx);
    sounds.swoosh();
    haptics.medium();
    setTimeout(() => setIsTransitioning(false), 350);
  }, [games.length, isTransitioning]);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
    startTimeRef.current = Date.now();
    setIsDragging(true);
    setDragOffset(0);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const delta = e.touches[0].clientY - startYRef.current;
    
    // Use RAF to throttle updates for better performance
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setDragOffset(delta);
    });
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    const elapsed = Date.now() - startTimeRef.current;
    const velocity = Math.abs(dragOffset) / elapsed;
    const threshold = Math.abs(dragOffset) > 60 || velocity > 0.4;

    if (threshold) {
      if (dragOffset < 0 && currentIndex < games.length - 1) {
        goTo(currentIndex + 1);
      } else if (dragOffset > 0 && currentIndex > 0) {
        goTo(currentIndex - 1);
      }
    }
    setDragOffset(0);
  }, [isDragging, dragOffset, currentIndex, games.length, goTo]);

  // Mouse handlers for desktop
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    startYRef.current = e.clientY;
    startTimeRef.current = Date.now();
    setIsDragging(true);
    setDragOffset(0);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const delta = e.clientY - startYRef.current;
    
    // Use RAF to throttle updates for better performance
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setDragOffset(delta);
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    const elapsed = Date.now() - startTimeRef.current;
    const velocity = Math.abs(dragOffset) / elapsed;
    const threshold = Math.abs(dragOffset) > 60 || velocity > 0.4;

    if (threshold) {
      if (dragOffset < 0 && currentIndex < games.length - 1) {
        goTo(currentIndex + 1);
      } else if (dragOffset > 0 && currentIndex > 0) {
        goTo(currentIndex - 1);
      }
    }
    setDragOffset(0);
  }, [isDragging, dragOffset, currentIndex, games.length, goTo]);

  const containerH = typeof window !== 'undefined' ? window.innerHeight : 800;

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: '#000', maxWidth: 430, margin: '0 auto' }}>
      {showParticles && <ParticleEffect active={showParticles} originX={0.5} originY={0.08} />}

      {/* ── Floating Stats (No Background) ── */}
      <div
        className="absolute top-0 left-0 right-0 z-50 flex items-center justify-end gap-3 px-4"
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 12px)',
          paddingBottom: 12,
          willChange: balancePulse ? 'transform' : 'auto',
          transform: 'translate3d(0, 0, 0)',
        }}
      >
        {/* Balance chip */}
        <motion.div
          animate={balancePulse ? { scale: [1, 1.12, 1] } : { scale: 1 }}
          transition={{ duration: 0.3 }}
          className="px-3 py-1.5 rounded-2xl flex items-center gap-1.5"
          style={{
            background: 'rgba(255,215,0,0.15)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,215,0,0.35)',
            boxShadow: balancePulse ? '0 0 16px rgba(255,215,0,0.5), 0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.3)',
            transform: 'translate3d(0, 0, 0)',
          }}
        >
          <span className="text-yellow-400 text-sm">💰</span>
          <span className="font-black text-white text-sm">{formatCurrency(gameState.balance)}</span>
        </motion.div>

        {/* Streak */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl"
          style={{
            background: 'rgba(255,107,107,0.15)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,107,107,0.3)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            transform: 'translate3d(0, 0, 0)',
          }}
        >
          <span className="text-sm">🔥</span>
          <span className="font-black text-white text-sm">{gameState.streak}</span>
          <span className="text-white/40 text-xs">day{gameState.streak !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* ── Reel stack ── */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        style={{ 
          userSelect: 'none', 
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <motion.div
          className="absolute left-0 right-0"
          style={{ 
            top: 0, 
            willChange: isDragging ? 'transform' : 'auto',
            transform: 'translate3d(0, 0, 0)'
          }}
          animate={{
            y: -(currentIndex * containerH) + (isDragging ? dragOffset * 0.4 : 0),
          }}
          transition={
            isDragging
              ? { type: 'tween', duration: 0 }
              : { type: 'spring', stiffness: 300, damping: 35, mass: 0.8 }
          }
        >
          {games.map((gameId, idx) => {
            // Only render slides near the current index for performance
            const isNearby = Math.abs(idx - currentIndex) <= 1;
            return (
              <div
                key={`${gameId}-${idx}`}
                style={{ 
                  height: containerH, 
                  overflow: 'hidden',
                  transform: 'translate3d(0, 0, 0)',
                  willChange: isNearby ? 'contents' : 'auto'
                }}
              >
                {isNearby ? (
                  <GameSlide gameId={gameId} isActive={idx === currentIndex} isFirstEver={idx === 0} />
                ) : (
                  <div className="w-full h-full" style={{ background: '#080810' }} />
                )}
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* ── Scroll indicator dots ── */}
      <div
        className="absolute right-3 flex flex-col gap-1.5 items-center"
        style={{ top: '50%', transform: 'translateY(-50%)', zIndex: 40 }}
      >
        {games.slice(Math.max(0, currentIndex - 2), currentIndex + 5).map((_, relIdx) => {
          const absIdx = Math.max(0, currentIndex - 2) + relIdx;
          const isActive = absIdx === currentIndex;
          return (
            <div
              key={absIdx}
              onClick={() => goTo(absIdx)}
              style={{
                width: isActive ? 6 : 4,
                height: isActive ? 20 : 4,
                borderRadius: 99,
                background: isActive ? '#fff' : 'rgba(255,255,255,0.3)',
                transition: 'all 0.2s',
                cursor: 'pointer',
              }}
            />
          );
        })}
      </div>

      {/* ── Bottom swipe hint (fades after first use) ── */}
      <div
        className="absolute bottom-0 left-0 right-0 flex justify-center items-end pb-8 z-40 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)',
          height: 80,
        }}
      >
        <motion.div
          animate={{ y: [0, -6, 0], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          className="flex flex-col items-center gap-0.5"
        >
          <div className="text-white/50 text-xs">swipe up for next game</div>
          <div className="text-white/40 text-lg">↑</div>
        </motion.div>
      </div>
    </div>
  );
}
