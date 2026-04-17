// ============================================================
// COIN FLIP GAME
// ============================================================
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptic, sound, formatCurrency } from '../store/gameStore';

type CoinSide = 'heads' | 'tails';
const BET_OPTIONS = [25, 50, 100, 250, 500, 1000];

interface CoinFlipProps {
  balance: number;
  onResult: (delta: number, won: boolean) => void;
  onClose: () => void;
}

const CoinFlip: React.FC<CoinFlipProps> = ({ balance, onResult, onClose }) => {
  const [choice, setChoice] = useState<CoinSide | null>(null);
  const [bet, setBet] = useState(100);
  const [result, setResult] = useState<CoinSide | null>(null);
  const [gameState, setGameState] = useState<'betting' | 'flipping' | 'result'>('betting');
  const [won, setWon] = useState<boolean | null>(null);

  const handleChoice = (side: CoinSide) => {
    haptic.light();
    sound.playClick();
    setChoice(side);
  };

  const flip = useCallback(() => {
    if (!choice || bet > balance || bet <= 0) return;
    haptic.medium();
    sound.playClick();

    setGameState('flipping');

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
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#0a0a0a',
      color: '#fff',
      fontFamily: 'Inter, -apple-system, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
      }}>
        <div style={{ fontSize: 20, fontWeight: 900 }}>🪙 Coin Flip</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#4ade80' }}>{formatCurrency(balance)}</div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              color: '#fff',
              fontSize: 16,
              cursor: 'pointer',
            }}
          >✕</button>
        </div>
      </div>

      {/* Coin */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
        <motion.div
          animate={gameState === 'flipping' ? {
            rotateY: [0, 180, 360, 540, 720, 900, 1080],
            scale: [1, 1.1, 1, 1.1, 1],
          } : {}}
          transition={{ duration: 1.8, ease: 'easeInOut' }}
          style={{
            width: 140,
            height: 140,
            borderRadius: '50%',
            background: gameState === 'result'
              ? (won ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #ef4444, #991b1b)')
              : 'linear-gradient(135deg, #FFD700, #FF8C00)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 70,
            boxShadow: '0 0 60px rgba(255,215,0,0.4), 0 20px 40px rgba(0,0,0,0.5)',
          }}
        >
          {gameState === 'flipping' ? '🪙' :
           gameState === 'result' ? (result === 'heads' ? '👑' : '🌟') : '🪙'}
        </motion.div>

        <AnimatePresence>
          {gameState === 'result' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ textAlign: 'center' }}
            >
              <div style={{ fontSize: 32, fontWeight: 900, color: won ? '#4ade80' : '#ef4444' }}>
                {won ? '🎉 WIN!' : '💀 BUST'}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: won ? '#4ade80' : '#ef4444' }}>
                {won ? `+${formatCurrency(safeBet)}` : `-${formatCurrency(safeBet)}`}
              </div>
              <div style={{ fontSize: 14, color: '#888', marginTop: 4 }}>
                Result: {result === 'heads' ? '👑 Heads' : '🌟 Tails'}
              </div>
            </motion.div>
          )}
          {gameState === 'flipping' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ fontSize: 18, color: '#FFD700', fontWeight: 700 }}
            >
              Flipping... 🌀
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div style={{ padding: '0 20px 32px' }}>
        {gameState === 'betting' && (
          <>
            <div style={{ fontSize: 11, color: '#666', textAlign: 'center', letterSpacing: 2, marginBottom: 10, textTransform: 'uppercase' }}>Pick Your Side</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              {(['heads', 'tails'] as CoinSide[]).map(side => (
                <button
                  key={side}
                  onClick={() => handleChoice(side)}
                  style={{
                    flex: 1,
                    padding: '16px 0',
                    borderRadius: 14,
                    background: choice === side ? 'linear-gradient(135deg, #FFD700, #FF8C00)' : 'rgba(255,255,255,0.07)',
                    border: choice === side ? '2px solid #FFD700' : '2px solid rgba(255,255,255,0.1)',
                    color: choice === side ? '#000' : '#fff',
                    fontSize: 16,
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  <span style={{ fontSize: 28 }}>{side === 'heads' ? '👑' : '🌟'}</span>
                  {side.toUpperCase()}
                </button>
              ))}
            </div>

            <div style={{ fontSize: 11, color: '#666', textAlign: 'center', letterSpacing: 2, marginBottom: 10, textTransform: 'uppercase' }}>Choose Bet</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 }}>
              {BET_OPTIONS.map(amount => (
                <button
                  key={amount}
                  onClick={() => { setBet(amount); haptic.light(); sound.playCoin(); }}
                  disabled={amount > balance}
                  style={{
                    padding: '10px 4px',
                    borderRadius: 10,
                    background: bet === amount ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.07)',
                    border: bet === amount ? '2px solid #4ade80' : '2px solid rgba(255,255,255,0.1)',
                    color: bet === amount ? '#4ade80' : '#aaa',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    opacity: amount > balance ? 0.3 : 1,
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  ${amount}
                </button>
              ))}
            </div>

            <button
              onClick={flip}
              disabled={!choice || safeBet <= 0}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: 14,
                background: choice && safeBet > 0 ? 'linear-gradient(135deg, #FF6B6B, #FF8E53)' : 'rgba(255,255,255,0.1)',
                border: 'none',
                color: choice && safeBet > 0 ? '#fff' : '#666',
                fontSize: 18,
                fontWeight: 900,
                cursor: choice && safeBet > 0 ? 'pointer' : 'not-allowed',
                fontFamily: 'Inter, sans-serif',
                boxShadow: choice && safeBet > 0 ? '0 4px 24px rgba(255,107,107,0.4)' : 'none',
              }}
            >
              🪙 FLIP IT!
            </button>
          </>
        )}

        {gameState === 'result' && (
          <button
            onClick={reset}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: 14,
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              border: 'none',
              color: '#fff',
              fontSize: 18,
              fontWeight: 900,
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              boxShadow: '0 4px 24px rgba(99,102,241,0.4)',
            }}
          >
            🔄 Play Again
          </button>
        )}
      </div>
    </div>
  );
};

export default CoinFlip;
