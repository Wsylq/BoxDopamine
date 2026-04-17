// ============================================================
// DOPAMINE BOX - Plinko Game
// ============================================================
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { haptic, sound, formatCurrency } from '../store/gameStore';

const MULTIPLIERS = [0.2, 0.5, 1.0, 1.5, 2.0, 1.5, 1.0, 0.5, 0.2];
const BET_OPTIONS = [10, 25, 50, 100, 250, 500, 1000];

interface PlinkoProps {
  balance: number;
  onResult: (delta: number, won: boolean) => void;
  onClose: () => void;
}

interface Ball { x: number; y: number; vx: number; vy: number; trail: { x: number; y: number }[]; }
interface Peg { x: number; y: number; }

const ROWS = 8;
const CANVAS_W = 320;
const CANVAS_H = 480;
const PEG_R = 5;
const BALL_R = 8;

const Plinko: React.FC<PlinkoProps> = ({ balance, onResult, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bet, setBet] = useState(25);
  const [dropping, setDropping] = useState(false);
  const [lastResult, setLastResult] = useState<{ mult: number; delta: number } | null>(null);
  const ballRef = useRef<Ball | null>(null);
  const animRef = useRef(0);
  const pegsRef = useRef<Peg[]>([]);

  const safeBet = Math.min(bet, balance);

  // Build peg layout
  useEffect(() => {
    const pegs: Peg[] = [];
    const topPad = 80;
    const rowH = (CANVAS_H - topPad - 80) / ROWS;
    for (let row = 0; row < ROWS; row++) {
      const count = row + 3;
      const y = topPad + row * rowH;
      const totalW = (count - 1) * 36;
      for (let col = 0; col < count; col++) {
        pegs.push({ x: CANVAS_W / 2 - totalW / 2 + col * 36, y });
      }
    }
    pegsRef.current = pegs;
  }, []);

  const drawScene = useCallback((ctx: CanvasRenderingContext2D, ball: Ball | null) => {
    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    bg.addColorStop(0, '#0a0a0f');
    bg.addColorStop(1, '#0f0a1a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Pegs
    for (const peg of pegsRef.current) {
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, PEG_R, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fill();
    }

    // Multiplier buckets
    const bucketW = CANVAS_W / MULTIPLIERS.length;
    const bucketY = CANVAS_H - 45;
    MULTIPLIERS.forEach((m, i) => {
      const bx = i * bucketW;
      const color = m >= 2 ? 'rgba(74,222,128,0.35)' : m >= 1 ? 'rgba(245,158,11,0.35)' : 'rgba(239,68,68,0.25)';
      const textColor = m >= 2 ? '#4ade80' : m >= 1 ? '#f59e0b' : '#ef4444';
      ctx.fillStyle = color;
      ctx.fillRect(bx + 1, bucketY, bucketW - 2, 40);
      ctx.fillStyle = textColor;
      ctx.font = 'bold 10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${m}x`, bx + bucketW / 2, bucketY + 25);
    });

    // Ball
    if (ball) {
      // Trail
      ball.trail.forEach((pt, i) => {
        const alpha = (i / ball.trail.length) * 0.4;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, BALL_R * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,215,0,${alpha})`;
        ctx.fill();
      });
      // Ball
      const grad = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, BALL_R);
      grad.addColorStop(0, '#FFE066');
      grad.addColorStop(1, '#CC9900');
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }
  }, []);

  const dropBall = () => {
    if (dropping || balance < safeBet) return;
    setDropping(true);
    setLastResult(null);
    haptic.medium();

    ballRef.current = {
      x: CANVAS_W / 2 + (Math.random() - 0.5) * 10,
      y: 20,
      vx: (Math.random() - 0.5) * 1,
      vy: 2,
      trail: [],
    };

    const animate = () => {
      const ball = ballRef.current;
      if (!ball) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Physics
      ball.vy += 0.25;
      ball.vx *= 0.99;
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Trail
      ball.trail.push({ x: ball.x, y: ball.y });
      if (ball.trail.length > 12) ball.trail.shift();

      // Peg collision
      for (const peg of pegsRef.current) {
        const dx = ball.x - peg.x;
        const dy = ball.y - peg.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < PEG_R + BALL_R) {
          const nx = dx / dist;
          const ny = dy / dist;
          const dot = ball.vx * nx + ball.vy * ny;
          ball.vx = (ball.vx - 2 * dot * nx) * 0.7 + (Math.random() - 0.5) * 1.5;
          ball.vy = Math.abs(ball.vy - 2 * dot * ny) * 0.6 + 1;
          ball.x = peg.x + nx * (PEG_R + BALL_R + 1);
          ball.y = peg.y + ny * (PEG_R + BALL_R + 1);
          sound.playPlinko();
          haptic.coin();
        }
      }

      // Wall bounce
      if (ball.x < BALL_R) { ball.x = BALL_R; ball.vx = Math.abs(ball.vx); }
      if (ball.x > CANVAS_W - BALL_R) { ball.x = CANVAS_W - BALL_R; ball.vx = -Math.abs(ball.vx); }

      drawScene(ctx, ball);

      // Bottom reached
      if (ball.y > CANVAS_H - 50) {
        const bucketW = CANVAS_W / MULTIPLIERS.length;
        const idx = Math.min(Math.floor(ball.x / bucketW), MULTIPLIERS.length - 1);
        const mult = MULTIPLIERS[idx];
        const delta = Math.floor(safeBet * mult) - safeBet;
        setLastResult({ mult, delta });
        setDropping(false);
        ballRef.current = null;
        onResult(delta, mult >= 1);
        if (mult >= 2) { haptic.jackpot(); sound.playJackpot(); }
        else if (mult >= 1) { haptic.win(); sound.playWin(); }
        else { haptic.lose(); sound.playLose(); }
        drawScene(ctx, null);
        return;
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const ctx = canvas.getContext('2d');
    if (ctx) drawScene(ctx, null);
    return () => cancelAnimationFrame(animRef.current);
  }, [drawScene]);

  return (
    <div className="flex flex-col h-full bg-black text-white select-none">
      {/* TOP BAR */}
      <div className="flex items-center justify-between px-5 pt-14 pb-2">
        <span className="text-green-400 font-bold text-lg">${balance.toFixed(0)}</span>
        <span className="text-white/40 text-xs tracking-widest uppercase">Plinko</span>
        <button onClick={onClose} className="text-white/50 text-2xl leading-none">×</button>
      </div>

      {/* CANVAS */}
      <div className="flex-1 flex items-center justify-center">
        <canvas ref={canvasRef} style={{ width: CANVAS_W, height: CANVAS_H, maxWidth: '100%' }} />
      </div>

      {/* RESULT */}
      {lastResult && (
        <div className="text-center py-2">
          <span className={`font-black text-xl ${lastResult.delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {lastResult.mult}x — {lastResult.delta >= 0 ? '+' : ''}{formatCurrency(lastResult.delta)}
          </span>
        </div>
      )}

      {/* BOTTOM */}
      <div className="px-6 pb-10 pt-2 flex flex-col gap-3">
        <div className="text-white/40 text-xs tracking-widest uppercase text-center">Bet Amount</div>
        <div className="flex gap-2 flex-wrap justify-center">
          {BET_OPTIONS.filter(b => b <= balance + 1).map(amount => (
            <button
              key={amount}
              onClick={() => { setBet(amount); haptic.light(); }}
              className="px-4 py-2 rounded-xl font-bold text-sm"
              style={{
                background: bet === amount ? 'linear-gradient(135deg, #22c55e,#16a34a)' : 'rgba(255,255,255,0.08)',
                color: bet === amount ? '#fff' : 'rgba(255,255,255,0.6)',
                border: bet === amount ? 'none' : '1px solid rgba(255,255,255,0.1)',
              }}
            >
              ${amount}
            </button>
          ))}
        </div>
        <button
          onClick={dropBall}
          disabled={dropping || balance < safeBet}
          className="w-full py-4 rounded-2xl font-black text-base text-black"
          style={{
            background: dropping ? 'rgba(255,255,255,0.2)' : 'linear-gradient(135deg, #FFD700,#FF8C00)',
            boxShadow: dropping ? 'none' : '0 4px 24px rgba(255,165,0,0.4)',
            opacity: balance < safeBet ? 0.5 : 1,
          }}
        >
          {dropping ? 'DROPPING...' : `DROP — ${formatCurrency(safeBet)}`}
        </button>
      </div>
    </div>
  );
};

export default Plinko;
