// ============================================================
// DOPAMINE BOX - Coin Flip Mini Game
// Heads or Tails — bet your coins, double or lose!
// ============================================================

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptic, sound, formatCurrency } from '../store/gameStore';

interface CoinFlipProps {
  balance: number;
  onResult: (delta: number, won: boolean) => void;
  onClose: () => void;
}

type CoinSide = 'heads' | 'tails';
type GameState = 'betting' | 'flipping' | 'result';

const BET_OPTIONS = [10, 50, 100, 500, 1000, 5000];

const CoinFlip: React.FC<CoinFlipProps> = ({ balance, onResult, onClose }) => {
  const [bet, setBet] = useState(100);
  const [choice, setChoice] = useState<CoinSide | null>(null);
  const [result, setResult] = useState<CoinSide | null>(null);
  const [gameState, setGameState] = useState<GameState>('betting');
  const [flips, setFlips] = useState(0); // total flips for animation
  const [won, setWon] = useState<boolean | null>(null);

  const handleChoice = (side: CoinSide) => {
    haptic.light();
    sound.playClick();
    setChoice(side);
  };

  const handleBetChange = (amount: number) => {
    const clamped = Math.min(amount, balance);
    setBet(clamped);
    haptic.light();
    sound.playCoin();
  };

  const flip = useCallback(() => {
    if (!choice || bet > balance || bet <= 0) return;
    haptic.medium();
    sound.playClick();
    
    setGameState('flipping');
    setFlips(f => f + 1);

    // Random result after animation
    setTimeout(() => {
      const outcome: CoinSide = Math.random() < 0.5 ? 'heads' : 'tails';
      const didWin = outcome === choice;
      setResult(outcome);
      setWon(didWin);
      setGameState('result');
      
      if (didWin) {
        haptic.win();
        sound.playWin();
      } else {
        haptic.lose();
        sound.playLose();
      }
      
      onResult(didWin ? bet : -bet, didWin);
    }, 1800);
  }, [choice, bet, balance, onResult]);

  const reset = () => {
    setResult(null);
    setWon(null);
    setChoice(null);
    setGameState('betting');
    haptic.light();
  };

  const safeBet = Math.min(bet, balance);

  return (
    <div className="flex flex-col items-center h-full overflow-y-auto pb-8">
      {/* Header */}
      <div className="w-full flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={onClose} className="text-2xl" style={{ background: 'none', border: 'none' }}>
          ✕
        </button>
        <h2 className="text-xl font-bold" style={{ fontFamily: 'Inter, sans-serif' }}>🪙 Coin Flip</h2>
        <div className="text-green-400 font-bold text-sm">{formatCurrency(balance)}</div>
      </div>

      {/* Coin Animation */}
      <div className="relative flex items-center justify-center my-6" style={{ height: 180 }}>
        <motion.div
          key={flips}
          animate={gameState === 'flipping' ? {
            rotateY: [0, 360, 720, 1080, 1440],
            scale: [1, 1.1, 1, 1.1, 1],
          } : {}}
          transition={{ duration: 1.6, ease: 'easeInOut' }}
          style={{
            width: 140,
            height: 140,
            borderRadius: '50%',
            background: gameState === 'result'
              ? (won ? 'linear-gradient(135deg, #FFD700, #FFA500)' : 'linear-gradient(135deg, #888, #555)')
              : 'linear-gradient(135deg, #FFD700, #FFA500)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 64,
            boxShadow: gameState === 'result' && won
              ? '0 0 40px rgba(255,215,0,0.8), 0 8px 32px rgba(0,0,0,0.3)'
              : '0 8px 32px rgba(0,0,0,0.3)',
            cursor: 'pointer',
          }}
        >
          {gameState === 'flipping' ? '🪙' : 
           gameState === 'result' ? (result === 'heads' ? '👑' : '🌟') : '🪙'}
        </motion.div>

        {/* Result glow ring */}
        {gameState === 'result' && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 1, repeat: Infinity }}
            style={{
              position: 'absolute',
              width: 140,
              height: 140,
              borderRadius: '50%',
              border: `3px solid ${won ? '#FFD700' : '#FF6B6B'}`,
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      {/* Result label */}
      <AnimatePresence>
        {gameState === 'result' && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center mb-4"
          >
            <div className="text-4xl font-black mb-1" style={{
              color: won ? '#00FF94' : '#FF4757',
              textShadow: won ? '0 0 20px rgba(0,255,148,0.5)' : '0 0 20px rgba(255,71,87,0.5)',
            }}>
              {won ? '🎉 WIN!' : '💀 BUST'}
            </div>
            <div className="text-lg font-bold" style={{ color: won ? '#00FF94' : '#FF4757' }}>
              {won ? `+${formatCurrency(safeBet)}` : `-${formatCurrency(safeBet)}`}
            </div>
            <div className="text-gray-400 text-sm mt-1">
              Result: {result === 'heads' ? '👑 Heads' : '🌟 Tails'}
            </div>
          </motion.div>
        )}
        {gameState === 'flipping' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xl font-bold text-yellow-400 mb-4"
          >
            Flipping... 🌀
          </motion.div>
        )}
      </AnimatePresence>

      {/* Choice buttons */}
      {gameState === 'betting' && (
        <div className="w-full px-6">
          <p className="text-center text-gray-400 text-sm mb-3 font-semibold">PICK YOUR SIDE</p>
          <div className="flex gap-4 mb-6">
            {(['heads', 'tails'] as CoinSide[]).map((side) => (
              <motion.button
                key={side}
                whileTap={{ scale: 0.93 }}
                onClick={() => handleChoice(side)}
                className="flex-1 py-4 rounded-2xl font-bold text-base flex flex-col items-center gap-1"
                style={{
                  background: choice === side
                    ? 'linear-gradient(135deg, #FFD700, #FF8C00)'
                    : 'rgba(255,255,255,0.08)',
                  border: choice === side ? '2px solid #FFD700' : '2px solid rgba(255,255,255,0.1)',
                  color: choice === side ? '#000' : '#fff',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                <span className="text-2xl">{side === 'heads' ? '👑' : '🌟'}</span>
                <span className="capitalize">{side}</span>
              </motion.button>
            ))}
          </div>

          {/* Bet selector */}
          <p className="text-center text-gray-400 text-sm mb-3 font-semibold">CHOOSE YOUR BET</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {BET_OPTIONS.map((amount) => (
              <motion.button
                key={amount}
                whileTap={{ scale: 0.93 }}
                onClick={() => handleBetChange(amount)}
                className="py-2 rounded-xl text-sm font-bold"
                style={{
                  background: bet === amount
                    ? 'linear-gradient(135deg, #00FF94, #00B4D8)'
                    : 'rgba(255,255,255,0.08)',
                  border: bet === amount ? '2px solid #00FF94' : '2px solid rgba(255,255,255,0.1)',
                  color: bet === amount ? '#000' : '#fff',
                  fontFamily: 'Inter, sans-serif',
                  opacity: amount > balance ? 0.4 : 1,
                }}
                disabled={amount > balance}
              >
                {formatCurrency(amount)}
              </motion.button>
            ))}
          </div>

          {/* Current bet display */}
          <div className="text-center mb-4 py-3 rounded-xl" style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)' }}>
            <span className="text-gray-400 text-sm">Betting: </span>
            <span className="text-yellow-400 font-black text-lg">{formatCurrency(safeBet)}</span>
            <span className="text-gray-400 text-sm"> → win </span>
            <span className="text-green-400 font-black text-lg">{formatCurrency(safeBet * 2)}</span>
          </div>

          {/* Flip button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={flip}
            disabled={!choice || safeBet <= 0}
            className="w-full py-4 rounded-2xl text-lg font-black"
            style={{
              background: choice && safeBet > 0
                ? 'linear-gradient(135deg, #FF6B6B, #FF8E53)'
                : 'rgba(255,255,255,0.1)',
              color: choice && safeBet > 0 ? '#fff' : '#666',
              fontFamily: 'Inter, sans-serif',
              boxShadow: choice && safeBet > 0 ? '0 4px 24px rgba(255,107,107,0.4)' : 'none',
            }}
          >
            🪙 FLIP IT!
          </motion.button>
        </div>
      )}

      {/* Play Again */}
      {gameState === 'result' && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileTap={{ scale: 0.95 }}
          onClick={reset}
          className="mt-4 px-10 py-4 rounded-2xl text-lg font-black"
          style={{
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            color: '#fff',
            fontFamily: 'Inter, sans-serif',
            boxShadow: '0 4px 24px rgba(102,126,234,0.4)',
          }}
        >
          🔄 Play Again
        </motion.button>
      )}
    </div>
  );
};

export default CoinFlip;
