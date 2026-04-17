// ============================================================
// DOPAMINE BOX - Game Modal
// Full-screen overlay for mini-games
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

const GameModal: React.FC<GameModalProps> = ({ game, balance, onClose, onResult }) => {
  const [showParticles, setShowParticles] = useState(false);
  const [particlePos, setParticlePos] = useState({ x: 0, y: 0 });
  const [resultEffect, setResultEffect] = useState<'win' | 'lose' | null>(null);
  const effectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleResult = (delta: number, won: boolean) => {
    if (effectTimeoutRef.current) clearTimeout(effectTimeoutRef.current);
    setResultEffect(won ? 'win' : 'lose');
    if (won && delta > 50) {
      setParticlePos({ x: window.innerWidth / 2, y: window.innerHeight / 3 });
      setShowParticles(true);
      setTimeout(() => setShowParticles(false), 2500);
    }
    effectTimeoutRef.current = setTimeout(() => setResultEffect(null), 800);
    onResult(delta, won);
  };

  return (
    <>
      <AnimatePresence>
        {game && (
          <motion.div
            key="modal"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-0 z-50"
            style={{ background: '#000' }}
          >
            {/* Win/Lose flash overlay */}
            <AnimatePresence>
              {resultEffect === 'win' && (
                <motion.div
                  key="win-flash"
                  initial={{ opacity: 0.6 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.8 }}
                  className="absolute inset-0 z-10 pointer-events-none"
                  style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.4) 0%, transparent 70%)' }}
                />
              )}
              {resultEffect === 'lose' && (
                <motion.div
                  key="lose-flash"
                  initial={{ opacity: 0.6 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.8 }}
                  className="absolute inset-0 z-10 pointer-events-none"
                  style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.4) 0%, transparent 70%)' }}
                />
              )}
            </AnimatePresence>

            {/* Game content */}
            <div className="h-full">
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ParticleEffect active={showParticles} x={particlePos.x} y={particlePos.y} />
    </>
  );
};

export default GameModal;
