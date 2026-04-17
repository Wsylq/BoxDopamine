// ============================================================
// DOPAMINE BOX - Game Modal
// Full-screen overlay for mini-games with iOS-style presentation
// Win = positive pulse, Lose = shake effect
// ============================================================
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CoinFlip from '../games/CoinFlip';
import HigherLower from '../games/HigherLower';
import Plinko from '../games/Plinko';
import FlappyCoins from '../games/FlappyCoins';
import ParticleEffect from './ParticleEffect';

type GameType = 'coinflip' | 'higherlower' | 'plinko' | 'flappy' | null;

interface GameModalProps {
  game: GameType;
  balance: number;
  onClose: () => void;
  onResult: (delta: number, won: boolean) => void;
}

const GAME_BACKGROUNDS: Record<string, string> = {
  coinflip: 'linear-gradient(180deg, #0a0a0a 0%, #0a0a0a 100%)',
  higherlower: 'linear-gradient(180deg, #0a0a0a 0%, #0a0a0a 100%)',
  plinko: 'linear-gradient(180deg, #0a0a0a 0%, #0a0a0a 100%)',
  flappy: 'linear-gradient(180deg, #0a0a0a 0%, #0a0a0a 100%)',
};

const GameModal: React.FC<GameModalProps> = ({ game, balance, onClose, onResult }) => {
  const [showParticles, setShowParticles] = useState(false);
  const [particlePos, setParticlePos] = useState({ x: 0, y: 0 });
  const [resultEffect, setResultEffect] = useState<'win' | 'lose' | null>(null);
  const effectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleResult = (delta: number, won: boolean) => {
    // Clear any existing effect
    if (effectTimeoutRef.current) clearTimeout(effectTimeoutRef.current);

    // Trigger visual effect
    setResultEffect(won ? 'win' : 'lose');

    if (won && delta > 50) {
      setParticlePos({ x: window.innerWidth / 2, y: window.innerHeight / 3 });
      setShowParticles(true);
      setTimeout(() => setShowParticles(false), 2500);
    }

    effectTimeoutRef.current = setTimeout(() => {
      setResultEffect(null);
    }, 800);

    onResult(delta, won);
  };



  return (
    <AnimatePresence>
      {game && (
        <motion.div
          key="game-modal"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 220 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            background: game ? GAME_BACKGROUNDS[game] : '#0a0a0a',
            overflow: 'hidden',
          }}
        >
          {/* Win/Lose overlay flash */}
          <AnimatePresence>
            {resultEffect === 'win' && (
              <motion.div
                key="win-flash"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.25, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(34, 197, 94, 1)',
                  zIndex: 500,
                  pointerEvents: 'none',
                  borderRadius: 0,
                }}
              />
            )}
            {resultEffect === 'lose' && (
              <motion.div
                key="lose-flash"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.3, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(239, 68, 68, 1)',
                  zIndex: 500,
                  pointerEvents: 'none',
                }}
              />
            )}
          </AnimatePresence>

          {/* Game container with shake/pulse */}
          <motion.div
            animate={
              resultEffect === 'lose'
                ? { x: [0, -14, 14, -10, 10, -6, 6, -3, 3, 0] }
                : resultEffect === 'win'
                ? { scale: [1, 1.025, 0.975, 1.01, 0.99, 1] }
                : { x: 0, scale: 1 }
            }
            transition={
              resultEffect === 'lose'
                ? { duration: 0.55, ease: 'easeInOut' }
                : resultEffect === 'win'
                ? { duration: 0.45, ease: 'easeInOut' }
                : {}
            }
            style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            {game === 'coinflip' && (
              <CoinFlip balance={balance} onResult={handleResult} onClose={onClose} />
            )}
            {game === 'higherlower' && (
              <HigherLower balance={balance} onResult={handleResult} onClose={onClose} />
            )}
            {game === 'plinko' && (
              <Plinko balance={balance} onResult={handleResult} onClose={onClose} />
            )}
            {game === 'flappy' && (
              <FlappyCoins balance={balance} onResult={handleResult} onClose={onClose} />
            )}
          </motion.div>
        </motion.div>
      )}

      {/* Particle effect overlay */}
      <ParticleEffect active={showParticles} x={particlePos.x} y={particlePos.y} />
    </AnimatePresence>
  );
};

export default GameModal;
