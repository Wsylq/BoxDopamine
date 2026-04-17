// ============================================================
// DOPAMINE BOX - Plinko Mini Game
// Drop the ball through pegs — land on multipliers!
// Physics-based plinko board with satisfying bounces
// ============================================================

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptic, sound, formatCurrency } from '../store/gameStore';

interface PlinkoProps {
  balance: number;
  onResult: (delta: number, won: boolean) => void;
  onClose: () => void;
}

const ROWS = 8;
const BOARD_WIDTH = 320;
const BOARD_HEIGHT = 360;
const PEG_RADIUS = 5;

// Multiplier slots at the bottom (higher risk = higher reward at edges)
const MULTIPLIERS = [0.2, 0.5, 1.0, 1.5, 2.0, 1.5, 1.0, 0.5, 0.2];

const BET_OPTIONS = [10, 50, 100, 500, 1000];

// Peg positions
const getPegs = () => {
  const pegs: { x: number; y: number }[] = [];
  for (let row = 0; row < ROWS; row++) {
    const count = row + 2;
    const rowY = 40 + row * (BOARD_HEIGHT - 80) / ROWS;
    for (let col = 0; col < count; col++) {
      const startX = BOARD_WIDTH / 2 - ((count - 1) / 2) * (BOARD_WIDTH / (ROWS + 1));
      pegs.push({ x: startX + col * (BOARD_WIDTH / (ROWS + 1)), y: rowY });
    }
  }
  return pegs;
};

interface BallState {
  x: number;
  y: number;
  progress: number; // 0 to 1
  slot: number;
  key: number;
}

const SLOT_COLORS = [
  '#FF4757', '#FF6B6B', '#FFA502', '#2ED573', '#00D2FF',
  '#2ED573', '#FFA502', '#FF6B6B', '#FF4757'
];

const Plinko: React.FC<PlinkoProps> = ({ balance, onResult, onClose }) => {
  const [bet, setBet] = useState(100);
  const [dropping, setDropping] = useState(false);
  const [balls, setBalls] = useState<BallState[]>([]);
  const [lastResult, setLastResult] = useState<{ multiplier: number; win: boolean } | null>(null);
  const [totalBallKey, setTotalBallKey] = useState(0);
  const pegs = useRef(getPegs()).current;
  const animRef = useRef<number>(0);

  const dropBall = useCallback(() => {
    if (dropping) return;
    const safeBet = Math.min(bet, balance);
    if (safeBet <= 0) return;
    
    haptic.medium();
    sound.playClick();
    setDropping(true);
    setLastResult(null);

    // Simulate ball path through pegs
    // Each row, ball goes left or right randomly
    const path: number[] = [];
    let pos = 0; // relative position (0 = center)
    for (let r = 0; r < ROWS; r++) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      pos += dir;
      path.push(pos);
    }
    // Map to slot index (0 to MULTIPLIERS.length-1)
    const normalizedSlot = Math.floor((pos + ROWS) / (ROWS * 2) * MULTIPLIERS.length);
    const slot = Math.max(0, Math.min(MULTIPLIERS.length - 1, normalizedSlot));

    // Animate ball
    const key = totalBallKey + 1;
    setTotalBallKey(key);

    // Calculate trajectory
    const startX = BOARD_WIDTH / 2;
    const endX = (slot + 0.5) * (BOARD_WIDTH / MULTIPLIERS.length);
    
    const newBall: BallState = { x: startX, y: 0, progress: 0, slot, key };
    setBalls(prev => [...prev, newBall]);

    let progress = 0;
    const duration = 60; // frames
    
    const animate = () => {
      progress += 1 / duration;
      
      // Play plinko sound at each peg row hit
      if (progress > 0 && Math.abs(progress * duration % (duration / ROWS)) < 1) {
        sound.playPlinko();
        haptic.light();
      }

      const currentX = startX + (endX - startX) * progress + Math.sin(progress * Math.PI * ROWS) * 10 * (1 - progress);
      const currentY = progress * (BOARD_HEIGHT - 30);

      setBalls(prev => prev.map(b => b.key === key ? {
        ...b, x: currentX, y: currentY, progress
      } : b));

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        // Ball landed
        const multiplier = MULTIPLIERS[slot];
        const won = multiplier >= 1;
        const delta = safeBet * multiplier - safeBet;
        
        if (won) {
          haptic.win();
          sound.playWin();
        } else {
          haptic.lose();
          sound.playLose();
        }

        setLastResult({ multiplier, win: won });
        onResult(delta, won);
        setDropping(false);
        
        // Remove ball after a moment
        setTimeout(() => {
          setBalls(prev => prev.filter(b => b.key !== key));
        }, 1000);
      }
    };

    animRef.current = requestAnimationFrame(animate);
  }, [dropping, bet, balance, onResult, totalBallKey]);

  useEffect(() => {
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const safeBet = Math.min(bet, balance);

  return (
    <div className="flex flex-col items-center h-full overflow-y-auto pb-8">
      {/* Header */}
      <div className="w-full flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={onClose} className="text-2xl" style={{ background: 'none', border: 'none', color: '#fff' }}>✕</button>
        <h2 className="text-xl font-bold text-white">🎯 Plinko</h2>
        <div className="text-green-400 font-bold text-sm">{formatCurrency(balance)}</div>
      </div>

      {/* Last result */}
      <AnimatePresence>
        {lastResult && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mb-2 px-6 py-2 rounded-2xl text-lg font-black"
            style={{
              background: lastResult.win ? 'rgba(0,255,148,0.15)' : 'rgba(255,71,87,0.15)',
              color: lastResult.win ? '#00FF94' : '#FF4757',
              border: `1px solid ${lastResult.win ? 'rgba(0,255,148,0.3)' : 'rgba(255,71,87,0.3)'}`,
            }}
          >
            {lastResult.win ? '🎉' : '💀'} {lastResult.multiplier}x — {lastResult.win ? `+${formatCurrency(safeBet * lastResult.multiplier - safeBet)}` : `-${formatCurrency(safeBet - safeBet * lastResult.multiplier)}`}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Plinko Board */}
      <div style={{ position: 'relative', width: BOARD_WIDTH, height: BOARD_HEIGHT, margin: '8px 0' }}>
        <svg width={BOARD_WIDTH} height={BOARD_HEIGHT} style={{ position: 'absolute', top: 0, left: 0 }}>
          {/* Pegs */}
          {pegs.map((peg, i) => (
            <circle
              key={i}
              cx={peg.x}
              cy={peg.y}
              r={PEG_RADIUS}
              fill="rgba(255,255,255,0.7)"
              style={{ filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.5))' }}
            />
          ))}

          {/* Slot dividers */}
          {Array.from({ length: MULTIPLIERS.length + 1 }).map((_, i) => (
            <line
              key={i}
              x1={(i * BOARD_WIDTH) / MULTIPLIERS.length}
              y1={BOARD_HEIGHT - 30}
              x2={(i * BOARD_WIDTH) / MULTIPLIERS.length}
              y2={BOARD_HEIGHT}
              stroke="rgba(255,255,255,0.3)"
              strokeWidth={1}
            />
          ))}
        </svg>

        {/* Slot labels */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 30,
          display: 'flex',
        }}>
          {MULTIPLIERS.map((mult, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: SLOT_COLORS[i],
                fontSize: 9,
                fontWeight: 900,
                color: '#fff',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {mult}x
            </div>
          ))}
        </div>

        {/* Balls */}
        {balls.map(ball => (
          <motion.div
            key={ball.key}
            style={{
              position: 'absolute',
              left: ball.x - 10,
              top: ball.y - 10,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #FFD700, #FF8C00)',
              boxShadow: '0 0 10px rgba(255,215,0,0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 900,
              color: '#000',
              zIndex: 10,
            }}
          >
            $
          </motion.div>
        ))}
      </div>

      {/* Bet options */}
      <div className="w-full px-4">
        <p className="text-center text-gray-400 text-sm mb-2 font-semibold">BET AMOUNT</p>
        <div className="grid grid-cols-5 gap-2 mb-3">
          {BET_OPTIONS.map((amount) => (
            <motion.button
              key={amount}
              whileTap={{ scale: 0.93 }}
              onClick={() => { setBet(amount); haptic.light(); sound.playCoin(); }}
              className="py-2 rounded-xl text-xs font-bold"
              style={{
                background: bet === amount ? 'linear-gradient(135deg, #00FF94, #00B4D8)' : 'rgba(255,255,255,0.08)',
                border: bet === amount ? '2px solid #00FF94' : '2px solid rgba(255,255,255,0.1)',
                color: bet === amount ? '#000' : '#fff',
                opacity: amount > balance ? 0.4 : 1,
              }}
              disabled={amount > balance}
            >
              {formatCurrency(amount)}
            </motion.button>
          ))}
        </div>

        {/* Drop button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={dropBall}
          disabled={dropping || safeBet <= 0}
          className="w-full py-4 rounded-2xl text-xl font-black"
          style={{
            background: !dropping && safeBet > 0
              ? 'linear-gradient(135deg, #FF6B6B, #FF8E53)'
              : 'rgba(255,255,255,0.1)',
            color: !dropping && safeBet > 0 ? '#fff' : '#666',
            boxShadow: !dropping ? '0 4px 24px rgba(255,107,107,0.4)' : 'none',
          }}
        >
          {dropping ? '⏳ Dropping...' : `🎯 DROP! (${formatCurrency(safeBet)})`}
        </motion.button>
      </div>

      {/* Multiplier legend */}
      <div className="mt-3 px-4 w-full">
        <div className="flex justify-between text-xs text-gray-500">
          <span>💀 Low mult = safe bet</span>
          <span>🚀 High mult = risky!</span>
        </div>
      </div>
    </div>
  );
};

export default Plinko;
