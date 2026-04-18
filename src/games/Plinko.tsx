import { useState, useCallback, useRef, useEffect } from 'react';
import { addBalance, formatCurrency, getState, sounds, haptics } from '../store/gameStore';

const MULTIPLIERS = [0.2, 0.5, 1.0, 1.5, 2.0, 1.5, 1.0, 0.5, 0.2];
const BETS = [10, 25, 50, 100, 250, 500];

interface Ball { 
  x: number; 
  y: number; 
  vx: number; 
  vy: number; 
  trail: { x: number; y: number }[];
}

interface Peg { 
  x: number; 
  y: number; 
}

const ROWS = 8;
const CANVAS_W = 320;
const CANVAS_H = 420;
const PEG_R = 5;
const BALL_R = 8;

export default function Plinko() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bet, setBet] = useState(50);
  const [dropping, setDropping] = useState(false);
  const [lastResult, setLastResult] = useState<{ mult: number; delta: number } | null>(null);
  const [showLossEffect, setShowLossEffect] = useState(false);
  const ballRef = useRef<Ball | null>(null);
  const animRef = useRef<number>(0);
  const pegsRef = useRef<Peg[]>([]);

  const { balance } = getState();
  const safeBet = Math.min(bet, balance);

  // Build peg layout
  useEffect(() => {
    const pegs: Peg[] = [];
    const topPad = 60;
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
      ctx.font = 'bold 10px system-ui';
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

  const dropBall = useCallback(() => {
    if (dropping || balance < safeBet) return;
    setDropping(true);
    setLastResult(null);
    haptics.medium();
    sounds.click();

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
          sounds.peg();
          haptics.light();
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
        const payout = Math.floor(safeBet * mult);
        const delta = payout - safeBet;
        
        setLastResult({ mult, delta });
        setDropping(false);
        ballRef.current = null;
        
        addBalance(delta);
        
        if (mult >= 2) { 
          haptics.win(); 
          sounds.bigWin(); 
        } else if (mult >= 1) { 
          haptics.win(); 
          sounds.win(); 
        } else { 
          haptics.lose(); 
          sounds.lose();
          setShowLossEffect(true);
          setTimeout(() => setShowLossEffect(false), 600);
        }
        
        drawScene(ctx, null);
        return;
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
  }, [dropping, balance, safeBet, drawScene]);

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
    <div className="flex flex-col items-center gap-4 px-4 py-4 h-full" style={{ paddingBottom: 'max(160px, calc(env(safe-area-inset-bottom) + 120px))' }}>
      {/* Red vignette on loss */}
      {showLossEffect && <div className="red-vignette" />}
      
      {/* Canvas */}
      <div className="relative" style={{ width: CANVAS_W, maxWidth: '100%' }}>
        <canvas 
          ref={canvasRef} 
          style={{ 
            width: '100%', 
            height: 'auto',
            display: 'block',
            borderRadius: '16px',
          }} 
        />
      </div>

      {/* Result */}
      {lastResult && !dropping && (
        <div className={`text-center ${lastResult.delta < 0 ? 'shake-intense' : ''}`}>
          <div className={`text-2xl font-black ${lastResult.delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {lastResult.delta > 0 ? `🎉 +${formatCurrency(lastResult.delta)}` : lastResult.delta === 0 ? '😐 Break Even' : `💀 ${formatCurrency(lastResult.delta)}`}
          </div>
          <div className="text-white/40 text-xs">{lastResult.mult}x multiplier → {formatCurrency(Math.floor(safeBet * lastResult.mult))}</div>
        </div>
      )}

      {dropping && (
        <div className="text-white/60 text-lg font-semibold">
          Dropping...
        </div>
      )}

      {!dropping && !lastResult && (
        <div className="text-white/40 text-sm">
          Drop the ball!
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
        onClick={dropBall}
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

      {balance <= 0 && (
        <div className="text-red-400 text-sm font-bold text-center">
          💀 Broke! Game over.
        </div>
      )}
    </div>
  );
}
