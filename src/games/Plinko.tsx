// ============================================================
// PLINKO GAME
// ============================================================
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptic, sound, formatCurrency } from '../store/gameStore';

const ROWS = 8;
const MULTIPLIERS = [0.2, 0.5, 1.0, 1.5, 2.0, 1.5, 1.0, 0.5, 0.2];
const BET_OPTIONS = [25, 50, 100, 250, 500, 1000];
const BOARD_WIDTH = 300;
const BOARD_HEIGHT = 260;

function getPegs() {
  const pegs: { x: number; y: number }[] = [];
  for (let row = 0; row < ROWS; row++) {
    const count = row + 2;
    const spacing = BOARD_WIDTH / (count + 1);
    const y = ((row + 1) / (ROWS + 1)) * BOARD_HEIGHT;
    for (let col = 0; col < count; col++) {
      pegs.push({ x: spacing * (col + 1), y });
    }
  }
  return pegs;
}

interface BallState {
  x: number;
  y: number;
  progress: number;
  slot: number;
  key: number;
}

interface PlinkoProps {
  balance: number;
  onResult: (delta: number, won: boolean) => void;
  onClose: () => void;
}

const Plinko: React.FC<PlinkoProps> = ({ balance, onResult, onClose }) => {
  const [bet, setBet] = useState(100);
  const [dropping, setDropping] = useState(false);
  const [balls, setBalls] = useState<BallState[]>([]);
  const [lastResult, setLastResult] = useState<{ multiplier: number; win: boolean } | null>(null);
  const [totalBallKey, setTotalBallKey] = useState(0);
  const pegs = useRef(getPegs()).current;
  const animRef = useRef(0);

  const dropBall = useCallback(() => {
    if (dropping) return;
    const safeBet = Math.min(bet, balance);
    if (safeBet <= 0) return;

    haptic.medium();
    sound.playClick();
    setDropping(true);
    setLastResult(null);

    let pos = 0;
    for (let r = 0; r < ROWS; r++) {
      pos += Math.random() < 0.5 ? -1 : 1;
    }
    const normalizedSlot = Math.floor((pos + ROWS) / (ROWS * 2) * MULTIPLIERS.length);
    const slot = Math.max(0, Math.min(MULTIPLIERS.length - 1, normalizedSlot));

    const key = totalBallKey + 1;
    setTotalBallKey(key);

    const startX = BOARD_WIDTH / 2;
    const endX = (slot + 0.5) * (BOARD_WIDTH / MULTIPLIERS.length);

    const newBall: BallState = { x: startX, y: 0, progress: 0, slot, key };
    setBalls(prev => [...prev, newBall]);

    let progress = 0;
    const duration = 60;

    const animate = () => {
      progress += 1 / duration;

      if (progress > 0 && Math.abs(progress * duration % (duration / ROWS)) < 1) {
        sound.playPlinko();
        haptic.light();
      }

      const currentX = startX + (endX - startX) * progress + Math.sin(progress * Math.PI * ROWS) * 10 * (1 - progress);
      const currentY = progress * (BOARD_HEIGHT - 30);

      setBalls(prev => prev.map(b => b.key === key ? { ...b, x: currentX, y: currentY, progress } : b));

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        const multiplier = MULTIPLIERS[slot];
        const won = multiplier >= 1;
        const delta = safeBet * multiplier - safeBet;

        if (won) { haptic.win(); sound.playWin(); }
        else { haptic.lose(); sound.playLose(); }

        setLastResult({ multiplier, win: won });
        onResult(delta, won);
        setDropping(false);

        setTimeout(() => {
          setBalls(prev => prev.filter(b => b.key !== key));
        }, 1000);
      }
    };

    animRef.current = requestAnimationFrame(animate);
  }, [dropping, bet, balance, onResult, totalBallKey]);

  useEffect(() => { return () => cancelAnimationFrame(animRef.current); }, []);

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
        <div style={{ fontSize: 20, fontWeight: 900 }}>🎯 Plinko</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#4ade80' }}>{formatCurrency(balance)}</div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 32, height: 32, color: '#fff', fontSize: 16, cursor: 'pointer' }}>✕</button>
        </div>
      </div>

      {/* Result */}
      <AnimatePresence>
        {lastResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              textAlign: 'center',
              padding: '4px 0',
              fontSize: 16,
              fontWeight: 900,
              color: lastResult.win ? '#4ade80' : '#ef4444',
            }}
          >
            {lastResult.win ? '🎉' : '💀'} {lastResult.multiplier}x
          </motion.div>
        )}
      </AnimatePresence>

      {/* Plinko board */}
      <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', flex: 1 }}>
        <div style={{ position: 'relative', width: BOARD_WIDTH, height: BOARD_HEIGHT }}>
          <svg width={BOARD_WIDTH} height={BOARD_HEIGHT} style={{ position: 'absolute', top: 0, left: 0 }}>
            {pegs.map((peg, i) => (
              <circle key={i} cx={peg.x} cy={peg.y} r={4} fill="rgba(255,255,255,0.6)" />
            ))}
          </svg>

          {balls.map(ball => (
            <div
              key={ball.key}
              style={{
                position: 'absolute',
                left: ball.x - 10,
                top: ball.y - 10,
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FFD700, #FF8C00)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 900,
                boxShadow: '0 0 10px rgba(255,215,0,0.6)',
              }}
            >
              $
            </div>
          ))}
        </div>
      </div>

      {/* Multiplier slots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 2, padding: '0 16px 10px' }}>
        {MULTIPLIERS.map((mult, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              padding: '6px 2px',
              borderRadius: 6,
              textAlign: 'center',
              fontSize: 9,
              fontWeight: 900,
              background: mult >= 2 ? 'rgba(74,222,128,0.3)' : mult >= 1 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.25)',
              color: mult >= 2 ? '#4ade80' : mult >= 1 ? '#f59e0b' : '#ef4444',
              border: `1px solid ${mult >= 2 ? 'rgba(74,222,128,0.4)' : mult >= 1 ? 'rgba(245,158,11,0.4)' : 'rgba(239,68,68,0.3)'}`,
            }}
          >
            {mult}x
          </div>
        ))}
      </div>

      {/* Bottom controls */}
      <div style={{ padding: '0 20px 32px' }}>
        <div style={{ fontSize: 11, color: '#666', textAlign: 'center', letterSpacing: 2, marginBottom: 10, textTransform: 'uppercase' }}>Bet Amount</div>
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
          onClick={dropBall}
          disabled={dropping || safeBet <= 0}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: 14,
            background: !dropping && safeBet > 0 ? 'linear-gradient(135deg, #FF6B6B, #FF8E53)' : 'rgba(255,255,255,0.1)',
            border: 'none',
            color: !dropping && safeBet > 0 ? '#fff' : '#666',
            fontSize: 18,
            fontWeight: 900,
            cursor: !dropping && safeBet > 0 ? 'pointer' : 'not-allowed',
            fontFamily: 'Inter, sans-serif',
            boxShadow: !dropping ? '0 4px 24px rgba(255,107,107,0.4)' : 'none',
          }}
        >
          {dropping ? '⏳ Dropping...' : `🎯 DROP! (${formatCurrency(safeBet)})`}
        </button>
      </div>
    </div>
  );
};

export default Plinko;
