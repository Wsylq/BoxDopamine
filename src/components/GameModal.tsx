import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import type { GameId } from '../store/gameStore';
import CoinFlip from '../games/CoinFlip';
import HigherLower from '../games/HigherLower';
import Plinko from '../games/Plinko';
import FlappyCoins from '../games/FlappyCoins';

const GAME_META: Record<GameId, { label: string; emoji: string; color: string }> = {
  coinflip: { label: 'Coin Flip', emoji: '🪙', color: '#FF6B6B' },
  higherlower: { label: 'Higher or Lower', emoji: '🃏', color: '#a78bfa' },
  plinko: { label: 'Plinko', emoji: '🎯', color: '#00FF94' },
  flappy: { label: 'Flappy Coins', emoji: '🐦', color: '#FFD700' },
};

interface Props {
  game: GameId | null;
  onClose: () => void;
}

export default function GameModal({ game, onClose }: Props) {
  const meta = game ? GAME_META[game] : null;

  useEffect(() => {
    if (game) {
      document.body.style.overflow = 'hidden';
    }
    return () => { document.body.style.overflow = ''; };
  }, [game]);

  return (
    <AnimatePresence>
      {game && meta && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          className="fixed inset-0 z-50 flex flex-col"
          style={{
            background: 'linear-gradient(180deg, #0a0a0f 0%, #0d0d1a 100%)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 pt-12 pb-4 shrink-0"
            style={{
              background: 'rgba(255,255,255,0.04)',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white/60"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              ✕
            </button>
            <div className="flex items-center gap-2 flex-1">
              <span className="text-2xl">{meta.emoji}</span>
              <span className="text-lg font-bold text-white">{meta.label}</span>
            </div>
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: meta.color, boxShadow: `0 0 8px ${meta.color}` }}
            />
          </div>

          {/* Game content */}
          <div className="flex-1 overflow-y-auto scroll-view">
            {game === 'coinflip' && <CoinFlip />}
            {game === 'higherlower' && <HigherLower />}
            {game === 'plinko' && <Plinko />}
            {game === 'flappy' && <FlappyCoins />}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
