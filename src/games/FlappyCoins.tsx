import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { addBalance, formatCurrency, sounds, haptics } from '../store/gameStore';

const BIRD_R = 20;
const GRAVITY = 0.55;
const FLAP_V = -9.5;
const PIPE_GAP = 160;
const PIPE_W = 60;
const PIPE_SPEED = 3;
const COIN_R = 14;
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  const stateRef = useRef({
    birdY: 0,
    birdV: 0,
    pipes: [] as Pipe[],
    coins: 0,
    score: 0,
    frame: 0,
    birdX: 0,
  });
  const animRef = useRef<number>(0);
  const phaseRef = useRef<Phase>('idle');
  const inputQueueRef = useRef<boolean>(false);

  const [phase, setPhase] = useState<Phase>('idle');
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try { return parseInt(localStorage.getItem('flappy_hs') || '0'); } catch { return 0; }
  });
  const [showWoohoo, setShowWoohoo] = useState(false);
  const [showLossEffect, setShowLossEffect] = useState(false);
  const woohooRef = useRef(false);

  // Update canvas dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        setDimensions({ width, height });
        stateRef.current.birdY = height / 2;
        stateRef.current.birdX = width * 0.25;
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  function spawnPipe(): Pipe {
    const H = dimensions.height;
    const W = dimensions.width;
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
    const W = dimensions.width;
    const H = dimensions.height;
    if (W === 0 || H === 0) return;

    ctx.clearRect(0, 0, W, H);

    // Background
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0a0a1a');
    grad.addColorStop(1, '#0d1b2a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    if (phaseRef.current === 'idle') {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = 'bold 24px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Tap to Start!', W / 2, H / 2);
      ctx.font = '16px system-ui';
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillText('Collect coins, avoid pipes', W / 2, H / 2 + 36);
      drawBird(ctx, s.birdX, H / 2, 0);
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
        ctx.font = 'bold 14px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('$', cx, cy + 5);
      }
    }

    // Bird
    const tilt = Math.max(-30, Math.min(45, s.birdV * 3));
    drawBird(ctx, s.birdX, s.birdY, tilt);
  }, [dimensions]);

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
    const H = dimensions.height;
    s.frame++;

    // Process queued input immediately
    if (inputQueueRef.current) {
      s.birdV = FLAP_V;
      inputQueueRef.current = false;
    }

    s.birdV += GRAVITY;
    s.birdY += s.birdV;

    if (s.frame % 90 === 0) {
      s.pipes.push(spawnPipe());
    }

    for (const pipe of s.pipes) {
      pipe.x -= PIPE_SPEED;

      if (!pipe.passed && pipe.x + PIPE_W < s.birdX) {
        pipe.passed = true;
        s.score++;
        setScore(s.score);
        sounds.coin();
      }

      if (!pipe.coinCollected && pipe.coinY !== undefined) {
        const cx = pipe.x + PIPE_W / 2;
        const cy = pipe.coinY;
        const dx = s.birdX - cx;
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
        const inX = s.birdX + BIRD_R > pipe.x && s.birdX - BIRD_R < pipe.x + PIPE_W;
        const inTopY = s.birdY - BIRD_R < pipe.topH;
        const inBotY = s.birdY + BIRD_R > pipe.topH + PIPE_GAP;
        return inX && (inTopY || inBotY);
      });

    if (hit) {
      phaseRef.current = 'dead';
      setPhase('dead');
      setShowLossEffect(true);
      setTimeout(() => setShowLossEffect(false), 600);
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
  }, [draw, highScore, dimensions.height, spawnPipe]);

  useEffect(() => {
    draw();
  }, [draw]);

  function handleTap() {
    const H = dimensions.height;
    const W = dimensions.width;
    const birdX = W * 0.25;
    
    if (phaseRef.current === 'idle') {
      phaseRef.current = 'playing';
      setPhase('playing');
      stateRef.current = { birdY: H / 2, birdV: FLAP_V, pipes: [], coins: 0, score: 0, frame: 0, birdX };
      woohooRef.current = false;
      setScore(0);
      setCoins(0);
      animRef.current = requestAnimationFrame(gameLoop);
      haptics.medium();
    } else if (phaseRef.current === 'playing') {
      inputQueueRef.current = true;
      sounds.flip();
      haptics.light();
    } else if (phaseRef.current === 'dead') {
      phaseRef.current = 'idle';
      setPhase('idle');
      stateRef.current = { birdY: H / 2, birdV: 0, pipes: [], coins: 0, score: 0, frame: 0, birdX };
      draw();
    }
  }

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 flex flex-col" 
      style={{ touchAction: 'none', cursor: 'pointer' }}
      onClick={handleTap}
      onTouchStart={(e) => {
        e.preventDefault();
        handleTap();
      }}
    >
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="absolute inset-0"
        style={{ cursor: 'pointer', touchAction: 'none' }}
      />

      {/* Red vignette on loss */}
      {showLossEffect && <div className="red-vignette" />}

      {/* Floating HUD - Top */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 pt-4">
        {/* Score */}
        <div
          className="px-4 py-2 rounded-2xl"
          style={{
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          }}
        >
          <div className="text-white/50 text-xs font-bold">SCORE</div>
          <div className="text-white font-black text-2xl">{score}</div>
        </div>

        {/* Coins */}
        <div
          className="px-4 py-2 rounded-2xl flex items-center gap-2"
          style={{
            background: 'rgba(255,215,0,0.15)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,215,0,0.35)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          }}
        >
          <span className="text-2xl">🪙</span>
          <div>
            <div className="text-white/50 text-xs font-bold">COINS</div>
            <div className="text-yellow-400 font-black text-xl">{coins}</div>
          </div>
        </div>
      </div>

      {/* Floating HUD - Bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center gap-4 px-4 pb-6">
        <div
          className="px-3 py-1.5 rounded-xl"
          style={{
            background: 'rgba(34,197,94,0.15)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(34,197,94,0.3)',
          }}
        >
          <span className="text-green-400 font-bold text-sm">+{formatCurrency(coins * REWARD_PER_COIN)}</span>
        </div>
        <div
          className="px-3 py-1.5 rounded-xl"
          style={{
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          <span className="text-white/60 text-xs">BEST: </span>
          <span className="text-white font-bold text-sm">{highScore}</span>
        </div>
      </div>

      {/* Woohoo animation */}
      <AnimatePresence>
        {showWoohoo && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
          >
            <div className="text-6xl font-black text-yellow-400" style={{ textShadow: '0 0 40px #FFD700' }}>
              WOOHOO! 🎉
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Over overlay */}
      {phase === 'dead' && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-20"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
        >
          <div className="shake-intense text-6xl font-black text-red-400" style={{ textShadow: '0 0 30px #ef4444' }}>
            💀 DEAD
          </div>
          <div className="flex gap-6 mt-4">
            <div className="text-center">
              <div className="text-white/40 text-xs font-bold">SCORE</div>
              <div className="text-white font-black text-3xl">{score}</div>
            </div>
            <div className="text-center">
              <div className="text-white/40 text-xs font-bold">COINS</div>
              <div className="text-yellow-400 font-black text-3xl">🪙 {coins}</div>
            </div>
          </div>
          <div className="text-green-400 font-bold text-xl mt-2">
            +{formatCurrency(coins * REWARD_PER_COIN)} earned
          </div>
          <div className="text-white/40 text-sm">Best: {highScore}</div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleTap();
            }}
            className="mt-4 px-8 py-3 rounded-2xl font-black text-black text-lg"
            style={{
              background: 'linear-gradient(135deg,#FFD700,#FFA500)',
              boxShadow: '0 8px 24px rgba(255,215,0,0.4)',
            }}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
