import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { addBalance, formatCurrency, getState, sounds, haptics } from '../store/gameStore';

const ROWS = 8;
const MULTIPLIERS = [0.2, 0.5, 1.0, 1.5, 2.0, 1.5, 1.0, 0.5, 0.2];
const BETS = [10, 25, 50, 100, 250, 500];

interface PlinkoPath {
  steps: ('L' | 'R')[];
  finalSlot: number;
  multiplier: number;
  win: number;
}

export default function Plinko() {
  const [bet, setBet] = useState(50);
  const [dropping, setDropping] = useState(false);
  const [lastPath, setLastPath] = useState<PlinkoPath | null>(null);
  const [ballPos, setBallPos] = useState<{ x: number; y: number } | null>(null);
  const [highlightSlot, setHighlightSlot] = useState<number | null>(null);
  const [showLossEffect, setShowLossEffect] = useState(false);

  const { balance } = getState();
  const safeBet = Math.min(bet, balance);

  const DROP_COLS = 9;
  const CANVAS_W = 320;
  const CANVAS_H = 380;
  const PEG_R = 5;
  const SLOT_H = 36;

  function getPegX(row: number, col: number) {
    const pegsInRow = row + 2;
    const totalWidth = CANVAS_W - 40;
    const spacing = totalWidth / (pegsInRow - 1);
    return 20 + col * spacing;
  }

  function getPegY(row: number) {
    return 30 + row * ((CANVAS_H - SLOT_H - 50) / ROWS);
  }

  const drop = useCallback(() => {
    if (dropping || balance <= 0) return;
    haptics.medium();
    sounds.click();
    addBalance(-safeBet);
    setDropping(true);
    setLastPath(null);
    setHighlightSlot(null);

    const steps: ('L' | 'R')[] = [];
    let slot = 0;
    for (let r = 0; r < ROWS; r++) {
      const dir: 'L' | 'R' = Math.random() < 0.5 ? 'L' : 'R';
      steps.push(dir);
      if (dir === 'R') slot++;
    }
    const multiplier = MULTIPLIERS[slot];
    const win = Math.round(safeBet * multiplier);

    let stepIndex = 0;
    let currentCol = 0;

    const animateStep = () => {
      if (stepIndex >= ROWS) {
        const finalX = 20 + (slot / (DROP_COLS - 1)) * (CANVAS_W - 40);
        const finalY = CANVAS_H - SLOT_H - 10;
        setBallPos({ x: finalX, y: finalY });
        setHighlightSlot(slot);

        if (win > 0) addBalance(win);

        const path: PlinkoPath = { steps, finalSlot: slot, multiplier, win };
        setLastPath(path);

        setTimeout(() => {
          setBallPos(null);
          setDropping(false);
          if (win > safeBet) { sounds.win(); haptics.win(); }
          else if (win === 0) { 
            sounds.lose(); 
            haptics.lose();
            setShowLossEffect(true);
            setTimeout(() => setShowLossEffect(false), 600);
          }
          else sounds.coin();
        }, 600);
        return;
      }

      const row = stepIndex;
      const x = getPegX(row, currentCol);
      const y = getPegY(row);
      setBallPos({ x, y });
      sounds.peg();
      haptics.light();

      if (steps[stepIndex] === 'R') currentCol++;
      stepIndex++;

      const delay = 120 + Math.random() * 60;
      setTimeout(animateStep, delay);
    };

    setTimeout(animateStep, 100);
  }, [dropping, balance, safeBet]);

  const pegColor = '#60a5fa';
  const slotColors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#22d3ee',
    '#22c55e', '#eab308', '#f97316', '#ef4444'
  ];

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-4 h-full">
      {/* Red vignette on loss */}
      {showLossEffect && <div className="red-vignette" />}
      
      {/* Canvas */}
      <div className="relative" style={{ width: CANVAS_W, height: CANVAS_H }}>
        <svg width={CANVAS_W} height={CANVAS_H} style={{ position: 'absolute', top: 0, left: 0 }}>
          {/* Pegs */}
          {Array.from({ length: ROWS }).map((_, row) => {
            const pegsInRow = row + 2;
            return Array.from({ length: pegsInRow }).map((_, col) => {
              const x = getPegX(row, col);
              const y = getPegY(row);
              return (
                <circle key={`${row}-${col}`} cx={x} cy={y} r={PEG_R}
                  fill={pegColor} opacity={0.9}
                  style={{ filter: 'drop-shadow(0 0 4px rgba(96,165,250,0.6))' }}
                />
              );
            });
          })}

          {/* Slots */}
          {MULTIPLIERS.map((m, i) => {
            const x = 20 + (i / (DROP_COLS - 1)) * (CANVAS_W - 40);
            const y = CANVAS_H - SLOT_H;
            const w = (CANVAS_W - 40) / (DROP_COLS - 1);
            const isHighlighted = highlightSlot === i;
            return (
              <g key={i}>
                <rect
                  x={x - w / 2 + 2} y={y}
                  width={w - 4} height={SLOT_H - 4}
                  rx={8}
                  fill={isHighlighted ? slotColors[i] : `${slotColors[i]}33`}
                  stroke={slotColors[i]}
                  strokeWidth={isHighlighted ? 2 : 1}
                  style={isHighlighted ? { filter: `drop-shadow(0 0 8px ${slotColors[i]})` } : {}}
                />
                <text
                  x={x} y={y + SLOT_H / 2 + 1}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={10} fontWeight="bold"
                  fill={isHighlighted ? '#fff' : slotColors[i]}
                >
                  {m}x
                </text>
              </g>
            );
          })}
        </svg>

        {/* Ball */}
        {ballPos && (
          <motion.div
            animate={{ x: ballPos.x - 10, y: ballPos.y - 10 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            style={{
              position: 'absolute',
              width: 20, height: 20,
              borderRadius: '50%',
              background: 'radial-gradient(circle at 35% 35%, #fff, #FFD700)',
              boxShadow: '0 0 12px rgba(255,215,0,0.8)',
            }}
          />
        )}
      </div>

      {/* Result */}
      {lastPath && !dropping && (
        <div className={`text-center ${lastPath.win === 0 ? 'shake-intense' : ''}`}>
          <div className={`text-2xl font-black ${lastPath.win > safeBet ? 'text-green-400' : lastPath.win === 0 ? 'text-red-400' : 'text-yellow-400'}`}>
            {lastPath.win > safeBet ? `🎉 +${formatCurrency(lastPath.win - safeBet)}` : lastPath.win === 0 ? '💀 Miss!' : `${lastPath.multiplier}x`}
          </div>
          <div className="text-white/40 text-xs">{lastPath.multiplier}x multiplier → {formatCurrency(lastPath.win)}</div>
        </div>
      )}

      {/* Bet selector */}
      <div className="w-full">
        <div className="text-white/40 text-xs mb-2 text-center">BET AMOUNT</div>
        <div className="flex flex-wrap gap-2 justify-center">
          {BETS.map(b => (
            <button
              key={b}
              onClick={() => { setBet(b); haptics.light(); sounds.click(); }}
              className="px-3 py-1.5 rounded-xl text-sm font-bold transition-all"
              style={{
                background: bet === b ? 'rgba(0,255,148,0.15)' : 'rgba(255,255,255,0.06)',
                border: bet === b ? '1px solid rgba(0,255,148,0.4)' : '1px solid rgba(255,255,255,0.1)',
                color: bet === b ? '#00FF94' : 'rgba(255,255,255,0.5)',
              }}
            >
              {formatCurrency(b)}
            </button>
          ))}
        </div>
      </div>

      {/* Drop button */}
      <button
        onClick={drop}
        disabled={dropping || balance <= 0}
        className="w-full py-4 rounded-2xl font-black text-lg transition-all"
        style={{
          background: dropping || balance <= 0
            ? 'rgba(255,255,255,0.05)'
            : 'linear-gradient(135deg, #00FF94, #00cc77)',
          color: dropping || balance <= 0 ? 'rgba(255,255,255,0.3)' : '#000',
          boxShadow: !dropping && balance > 0 ? '0 4px 20px rgba(0,255,148,0.4)' : 'none',
        }}
      >
        {dropping ? 'Dropping...' : `Drop Ball — ${formatCurrency(safeBet)}`}
      </button>
    </div>
  );
}
