import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { addBalance, formatCurrency, sounds, haptics } from '../store/gameStore';

const W = 320;
const H = 460;
const BIRD_X = 70;
const BIRD_R = 16;
const GRAVITY = 0.45;
const FLAP_V = -8;
const PIPE_GAP = 130;
const PIPE_W = 52;
const PIPE_SPEED = 2.6;
const COIN_R = 12;
const REWARD_PER_COIN = 5;

interface Pipe {
  x: number;
  topH: number;
  passed: boolean;
  coinY?: number;
  coinCollected?: boolean;
}

type Phase = 'idle' | 'playing' | 'dead';

export default function FlappyCoins() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    birdY: H / 2,
    birdV: 0,
    pipes: [] as Pipe[],
    coins: 0,
    score: 0,
    frame: 0,
  });
  const animRef = useRef<number>(0);
  const phaseRef = useRef<Phase>('idle');

  const [phase, setPhase] = useState<Phase>('idle');
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try { return parseInt(localStorage.getItem('flappy_hs') || '0'); } catch { return 0; }
  });
  const [showWoohoo, setShowWoohoo] = useState(false);
  const woohooRef = useRef(false);



  function spawnPipe(): Pipe {
    const topH = 60 + Math.random() * (H - PIPE_GAP - 120);
    const coinY = topH + PIPE_GAP / 2;
    return { x: W + 20, topH, passed: false, coinY, coinCollected: false };
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const s = stateRef.current;

    ctx.clearRect(0, 0, W, H);

    // Background
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0a0a1a');
    grad.addColorStop(1, '#0d1b2a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    if (phaseRef.current === 'idle') {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = 'bold 18px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Tap to Start!', W / 2, H / 2);
      ctx.font = '14px system-ui';
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillText('Collect coins, avoid pipes', W / 2, H / 2 + 28);
      drawBird(ctx, BIRD_X, H / 2, 0);
      return;
    }

    // Pipes
    for (const pipe of s.pipes) {
      const pipeGrad = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_W, 0);
      pipeGrad.addColorStop(0, '#2d6a4f');
      pipeGrad.addColorStop(0.5, '#40916c');
      pipeGrad.addColorStop(1, '#1b4332');
      ctx.fillStyle = pipeGrad;
      ctx.beginPath();
      (ctx as any).roundRect(pipe.x, 0, PIPE_W, pipe.topH, [0, 0, 8, 8]);
      ctx.fill();
      ctx.fillRect(pipe.x - 4, pipe.topH - 20, PIPE_W + 8, 20);

      const botY = pipe.topH + PIPE_GAP;
      ctx.fillStyle = pipeGrad;
      ctx.beginPath();
      (ctx as any).roundRect(pipe.x, botY, PIPE_W, H - botY, [8, 8, 0, 0]);
      ctx.fill();
      ctx.fillRect(pipe.x - 4, botY, PIPE_W + 8, 20);

      if (!pipe.coinCollected && pipe.coinY !== undefined) {
        const cx = pipe.x + PIPE_W / 2;
        const cy = pipe.coinY;
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, COIN_R);
        glow.addColorStop(0, '#FFD700');
        glow.addColorStop(0.6, '#FFA500');
        glow.addColorStop(1, 'rgba(255,165,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, COIN_R + 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(cx, cy, COIN_R, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFF8DC';
        ctx.font = 'bold 12px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('$', cx, cy + 4);
      }
    }

    // Bird
    const tilt = Math.max(-30, Math.min(45, s.birdV * 3));
    drawBird(ctx, BIRD_X, s.birdY, tilt);

    // Score
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 28px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(`${s.score}`, W / 2, 40);

    // Coins
    ctx.font = 'bold 14px system-ui';
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'left';
    ctx.fillText(`🪙 ${s.coins} × $${REWARD_PER_COIN}`, 12, 40);
  }, []);

  function drawBird(ctx: CanvasRenderingContext2D, x: number, y: number, tilt: number) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((tilt * Math.PI) / 180);

    const bodyGrad = ctx.createRadialGradient(-2, -2, 2, 0, 0, BIRD_R);
    bodyGrad.addColorStop(0, '#FFE066');
    bodyGrad.addColorStop(1, '#FF8C00');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(0, 0, BIRD_R, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.ellipse(-4, 4, 8, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(6, -4, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(7, -4, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FF6B35';
    ctx.beginPath();
    ctx.moveTo(13, -1);
    ctx.lineTo(20, 1);
    ctx.lineTo(13, 3);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  const gameLoop = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    const s = stateRef.current;
    s.frame++;

    s.birdV += GRAVITY;
    s.birdY += s.birdV;

    if (s.frame % 90 === 0) {
      s.pipes.push(spawnPipe());
    }

    for (const pipe of s.pipes) {
      pipe.x -= PIPE_SPEED;

      if (!pipe.passed && pipe.x + PIPE_W < BIRD_X) {
        pipe.passed = true;
        s.score++;
        setScore(s.score);
        sounds.coin();
      }

      if (!pipe.coinCollected && pipe.coinY !== undefined) {
        const cx = pipe.x + PIPE_W / 2;
        const cy = pipe.coinY;
        const dx = BIRD_X - cx;
        const dy = s.birdY - cy;
        if (Math.sqrt(dx * dx + dy * dy) < BIRD_R + COIN_R) {
          pipe.coinCollected = true;
          s.coins++;
          setCoins(s.coins);
          addBalance(REWARD_PER_COIN);
          sounds.coin();
          haptics.light();

          if (s.coins >= 5 && !woohooRef.current) {
            woohooRef.current = true;
            sounds.woohoo();
            setShowWoohoo(true);
            setTimeout(() => setShowWoohoo(false), 1500);
          }
        }
      }
    }

    s.pipes = s.pipes.filter(p => p.x > -PIPE_W - 10);

    // Collision
    const hit = s.birdY - BIRD_R < 0 || s.birdY + BIRD_R > H ||
      s.pipes.some(pipe => {
        const inX = BIRD_X + BIRD_R > pipe.x && BIRD_X - BIRD_R < pipe.x + PIPE_W;
        const inTopY = s.birdY - BIRD_R < pipe.topH;
        const inBotY = s.birdY + BIRD_R > pipe.topH + PIPE_GAP;
        return inX && (inTopY || inBotY);
      });

    if (hit) {
      phaseRef.current = 'dead';
      setPhase('dead');
      sounds.lose();
      haptics.lose();
      if (s.score > highScore) {
        setHighScore(s.score);
        try { localStorage.setItem('flappy_hs', String(s.score)); } catch {}
      }
      cancelAnimationFrame(animRef.current);
      return;
    }

    draw();
    animRef.current = requestAnimationFrame(gameLoop);
  }, [draw, highScore]);

  useEffect(() => {
    draw();
  }, [draw]);

  function flap() {
    if (phaseRef.current === 'idle') {
      phaseRef.current = 'playing';
      setPhase('playing');
      stateRef.current = { birdY: H / 2, birdV: FLAP_V, pipes: [], coins: 0, score: 0, frame: 0 };
      woohooRef.current = false;
      setScore(0);
      setCoins(0);
      animRef.current = requestAnimationFrame(gameLoop);
      haptics.medium();
    } else if (phaseRef.current === 'playing') {
      stateRef.current.birdV = FLAP_V;
      sounds.flip();
      haptics.light();
    } else if (phaseRef.current === 'dead') {
      phaseRef.current = 'idle';
      setPhase('idle');
      stateRef.current = { birdY: H / 2, birdV: 0, pipes: [], coins: 0, score: 0, frame: 0 };
      draw();
    }
  }

  useEffect(() => {
    return () => { cancelAnimationFrame(animRef.current); };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-4 h-full">
      <div className="relative" style={{ width: W }}>
        <canvas
          ref={canvasRef}
          width={W} height={H}
          onClick={flap}
          style={{
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer',
            display: 'block',
          }}
        />

        <AnimatePresence>
          {showWoohoo && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className="text-4xl font-black text-yellow-400" style={{ textShadow: '0 0 30px #FFD700' }}>
                WOOHOO! 🎉
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {phase === 'dead' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
            <div className="text-3xl font-black text-red-400">💀 DEAD</div>
            <div className="text-white/60 text-sm">Score: {score} | Coins: {coins}</div>
            <div className="text-white/40 text-xs">Best: {highScore}</div>
            <div className="text-green-400 font-bold text-sm">+{formatCurrency(coins * REWARD_PER_COIN)} earned</div>
            <button
              onClick={flap}
              className="mt-2 px-6 py-2 rounded-xl font-black text-black"
              style={{ background: 'linear-gradient(135deg,#FFD700,#FFA500)' }}
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-4 text-center">
        <div>
          <div className="text-white/40 text-xs">SCORE</div>
          <div className="text-white font-black text-xl">{score}</div>
        </div>
        <div>
          <div className="text-white/40 text-xs">COINS</div>
          <div className="text-yellow-400 font-black text-xl">🪙 {coins}</div>
        </div>
        <div>
          <div className="text-white/40 text-xs">EARNED</div>
          <div className="text-green-400 font-black text-xl">{formatCurrency(coins * REWARD_PER_COIN)}</div>
        </div>
        <div>
          <div className="text-white/40 text-xs">BEST</div>
          <div className="text-white/60 font-black text-xl">{highScore}</div>
        </div>
      </div>

      {phase !== 'playing' && (
        <div className="text-white/30 text-xs text-center">
          {phase === 'idle' ? 'Tap the game to start flying!' : 'Tap to play again'}
        </div>
      )}
    </div>
  );
}
