// ============================================================
// DOPAMINE BOX - Game Modal
// Full-screen overlay for mini-games with iOS-style presentation
// ============================================================

import React from 'react';
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

const GAME_BACKGROUNDS: Record<Exclude<GameType, null>, string> = {
  coinflip: 'linear-gradient(180deg, #1a0a00 0%, #2d1200 100%)',
  higherlower: 'linear-gradient(180deg, #0a001a 0%, #1a0030 100%)',
  plinko: 'linear-gradient(180deg, #001a0a 0%, #001a30 100%)',
  flappy: 'linear-gradient(180deg, #0f0c29 0%, #302b63 100%)',
};

const GameModal: React.FC<GameModalProps> = ({ game, balance, onClose, onResult }) => {
  const [showParticles, setShowParticles] = React.useState(false);
  const [particlePos, setParticlePos] = React.useState({ x: 0, y: 0 });

  const handleResult = (delta: number, won: boolean) => {
    if (won && delta > 100) {
      setParticlePos({ x: window.innerWidth / 2, y: window.innerHeight / 3 });
      setShowParticles(true);
      setTimeout(() => setShowParticles(false), 2500);
    }
    onResult(delta, won);
  };

  return (
    <>
      <AnimatePresence>
        {game && (
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 200 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100,
              background: GAME_BACKGROUNDS[game],
              display: 'flex',
              flexDirection: 'column',
              color: 'white',
              overflowY: 'auto',
            }}
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
        )}
      </AnimatePresence>

      {/* Particle effect overlay */}
      <ParticleEffect
        active={showParticles}
        x={particlePos.x}
        y={particlePos.y}
        count={100}
      />
    </>
  );
};

export default GameModal;
