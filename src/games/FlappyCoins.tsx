// ============================================================
// DOPAMINE BOX - Flappy Coins
// Flappy Bird clone with coin rewards
// Matching the UI from screenshots
// ============================================================
import React, { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptic, sound, formatCurrency } from '../store/gameStore';

const CANVAS_W = 320;
const CANVAS_H = 500;
const BIRD_X = 70;
const BIRD_RADIUS = 11;
const GRAVITY = 0.45;
const FLAP_POWER = -7.5;
const PIPE_WIDTH = 52;
const PIPE_GAP = 145;
const PIPE_SPEED = 2.8;
const COIN_SIZE = 18;

interface Pipe {
  x: number; topH: number; passed: boolean;
  hasCoin: boolean; coinY: number; coinCollected: boolean;
}

interface GameState {
  birdY: number; birdVY: number; pipes: Pipe[];
  coins: number; frame: number; alive: boolean; started: boolean; bestScore: number;
}

interface FlappyCoinsProps {
  balance: number;
  onResult: (delta: number, won: boolean) => void;
  onClose: () => void;
}

const FlappyCoins: React.FC<FlappyCoinsProps> = ({ balance, onResult, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>({
    birdY: CANVAS_H / 2, birdVY: 0, pipes: [], coins: 0, frame: 0,
    alive: false, started: false, bestScore: parseInt(localStorage.getItem('flappy_best') || '0'),
  });
  const animRef = useRef(0);
  const [displayState, setDisplayState] = useState<'idle' | 'playing' | 'dead'>('idle');
  const [displayCoins, setDisplayCoins] = useState(0);
  const [displayBest, setDisplayBest] = useState(parseInt(localStorage.getItem('flappy_best') || '0'));
  const [woohoo, setWoohoo] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(0);
  const [deathScore, setDeathScore] = useState(0);

  const REWARD_PER_COIN = Math.max(10, Math.floor(balance * 0.01));
  const MULTIPLIER = 1.5;

  const spawnPipe = (x: number): Pipe => {
    const topH = 70 + Math.random() * (CANVAS_H - PIPE_GAP - 140);
    const coinY = topH + PIPE_GAP / 2;
    return { x, topH, passed: false, hasCoin: true, coinY, coinCollected: false };
  };

  const resetGame = () => {
    stateRef.current = {
      birdY: CANVAS_H / 2, birdVY: 0,
      pipes: [spawnPipe(CANVAS_W + 100)],
      coins: 0, frame: 0, alive: true, started: true,
      bestScore: stateRef.current.bestScore,
    };
    setDisplayCoins(0);
    setDisplayState('playing');
    setWoohoo(false);
    setDeathScore(0);
  };

  const flap = useCallback(() => {
    const state = stateRef.current;
    if (!state.alive) { resetGame(); return; }
    state.birdVY = FLAP_POWER;
    haptic.light();
    sound.playFlap();
  }, []);

  const draw = useCallback((ctx: CanvasRenderingContext2D, state: GameState) => {
    // Deep dark background
    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 25; i++) {
      const sx = ((i * 137 + state.frame * 0.15) % CANVAS_W);
      const sy = (i * 79) % (CANVAS_H - 30);
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }

    // Ground
    ctx.fillStyle = '#1a2e0a';
    ctx.fillRect(0, CANVAS_H - 20, CANVAS_W, 20);
    ctx.fillStyle = '#2d5016';
    ctx.fillRect(0, CANVAS_H - 20, CANVAS_W, 4);

    // Pipes
    for (const pipe of state.pipes) {
      const pipeGrad = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
      pipeGrad.addColorStop(0, '#1fa01f');
      pipeGrad.addColorStop(0.4, '#2dde2d');
      pipeGrad.addColorStop(1, '#167016');
      ctx.fillStyle = pipeGrad;

      // Top pipe
      ctx.beginPath();
      ctx.roundRect(pipe.x, 0, PIPE_WIDTH, pipe.topH, [0, 0, 6, 6]);
      ctx.fill();
      // Top pipe cap
      ctx.fillRect(pipe.x - 5, pipe.topH - 22, PIPE_WIDTH + 10, 22);

      // Bottom pipe
      const botY = pipe.topH + PIPE_GAP;
      ctx.beginPath();
      ctx.roundRect(pipe.x, botY + 22, PIPE_WIDTH, CANVAS_H - botY - 42, [6, 6, 0, 0]);
      ctx.fill();
      // Bottom pipe cap
      ctx.fillRect(pipe.x - 5, botY, PIPE_WIDTH + 10, 22);

      // Coin
      if (pipe.hasCoin && !pipe.coinCollected) {
        ctx.save();
        ctx.translate(pipe.x + PIPE_WIDTH / 2, pipe.coinY);
        const spinAngle = (state.frame * 4) % 360;
        ctx.scale(Math.cos((spinAngle * Math.PI) / 180), 1);
        const coinGrad = ctx.createRadialGradient(-2, -2, 1, 0, 0, COIN_SIZE / 2);
        coinGrad.addColorStop(0, '#FFE066');
        coinGrad.addColorStop(1, '#CC8800');
        ctx.fillStyle = coinGrad;
        ctx.beginPath();
        ctx.arc(0, 0, COIN_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#7a5c00';
        ctx.font = 'bold 9px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 0);
        ctx.restore();
      }
    }

    // Bird
    ctx.save();
    ctx.translate(BIRD_X, state.birdY);
    ctx.rotate(Math.min(Math.max(state.birdVY * 0.05, -0.5), 0.8));

    // Body
    const bodyGrad = ctx.createRadialGradient(-2, -2, 1, 0, 0, BIRD_RADIUS);
    bodyGrad.addColorStop(0, '#FFE066');
    bodyGrad.addColorStop(1, '#CC8800');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(0, 0, BIRD_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Eye white
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(5, -4, 5, 0, Math.PI * 2);
    ctx.fill();
    // Pupil
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(7, -4, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Beak
    ctx.fillStyle = '#FF6B00';
    ctx.beginPath();
    ctx.moveTo(12, -1);
    ctx.lineTo(20, 1);
    ctx.lineTo(12, 4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Score in center top
    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px -apple-system, Arial';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 6;
    ctx.fillText(`${state.coins}`, CANVAS_W / 2, 38);
    ctx.shadowBlur = 0;
  }, []);

  const gameLoop = useCallback(() => {
    const state = stateRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (state.alive && state.started) {
      state.birdVY += GRAVITY;
      state.birdY += state.birdVY;
      state.frame++;

      const lastPipe = state.pipes[state.pipes.length - 1];
      if (!lastPipe || lastPipe.x < CANVAS_W - 190) {
        state.pipes.push(spawnPipe(CANVAS_W + PIPE_WIDTH));
      }

      for (const pipe of state.pipes) {
        pipe.x -= PIPE_SPEED;
        if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X - BIRD_RADIUS) pipe.passed = true;
        if (pipe.hasCoin && !pipe.coinCollected) {
          const dx = Math.abs(BIRD_X - (pipe.x + PIPE_WIDTH / 2));
          const dy = Math.abs(state.birdY - pipe.coinY);
          if (dx < BIRD_RADIUS + COIN_SIZE / 2 && dy < BIRD_RADIUS + COIN_SIZE / 2) {
            pipe.coinCollected = true;
            state.coins++;
            setDisplayCoins(state.coins);
            haptic.coin();
            sound.playCoin();
          }
        }
        const inPipeX = BIRD_X + BIRD_RADIUS > pipe.x && BIRD_X - BIRD_RADIUS < pipe.x + PIPE_WIDTH;
        const inTop = state.birdY - BIRD_RADIUS < pipe.topH;
        const inBot = state.birdY + BIRD_RADIUS > pipe.topH + PIPE_GAP;
        if (inPipeX && (inTop || inBot)) state.alive = false;
      }

      state.pipes = state.pipes.filter(p => p.x > -PIPE_WIDTH - 20);

      if (state.birdY + BIRD_RADIUS > CANVAS_H - 20 || state.birdY - BIRD_RADIUS < 0) {
        state.alive = false;
      }

      if (!state.alive) {
        haptic.lose();
        sound.playLose();
        const earned = Math.floor(state.coins * REWARD_PER_COIN * MULTIPLIER);
        const won = state.coins >= 3;
        if (state.coins > state.bestScore) {
          state.bestScore = state.coins;
          localStorage.setItem('flappy_best', state.coins.toString());
          setDisplayBest(state.coins);
        }
        if (state.coins >= 5) {
          setWoohoo(true);
          sound.playWoohoo();
          haptic.jackpot();
          setTimeout(() => setWoohoo(false), 3000);
        }
        setDeathScore(state.coins);
        setRewardAmount(earned);
        if (earned > 0) onResult(earned, won);
        setDisplayState('dead');
      }
    }

    draw(ctx, state);

    if (state.alive || !state.started) {
      animRef.current = requestAnimationFrame(gameLoop);
    }
  }, [draw, REWARD_PER_COIN, onResult]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) { canvas.width = CANVAS_W; canvas.height = CANVAS_H; }
    stateRef.current.started = false;
    stateRef.current.alive = false;
    animRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animRef.current);
  }, [gameLoop]);

  const handleTap = () => {
    if (displayState === 'idle' || displayState === 'dead') {
      resetGame();
      cancelAnimationFrame(animRef.current);
      animRef.current = requestAnimationFrame(gameLoop);
    } else {
      flap();
    }
  };

  return (
    <div className="flex flex-col h-full bg-black text-white select-none">
      {/* TOP BAR */}
      <div className="flex items-center justify-between px-5 pt-14 pb-1">
        <div className="flex items-center gap-2">
          <span className="text-yellow-400 text-xs font-bold">🪙 {displayCoins}</span>
        </div>
        <div className="text-green-400 font-bold text-sm">${balance.toFixed(0)}</div>
        <div className="flex items-center gap-2">
          <span className="text-white/50 text-xs">🏆 {displayBest}</span>
          <button onClick={onClose} className="text-white/50 text-2xl leading-none ml-2">×</button>
        </div>
      </div>

      {/* CANVAS AREA */}
      <div
        className="flex-1 relative overflow-hidden"
        onClick={handleTap}
        onTouchStart={e => { e.preventDefault(); handleTap(); }}
        style={{ touchAction: 'none', cursor: 'pointer' }}
      >
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />

        {/* IDLE OVERLAY */}
        {displayState === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="text-6xl">🐦</div>
            <div className="font-black text-2xl text-white tracking-wider">FLAPPY COINS</div>
            <div className="text-yellow-400 text-sm font-semibold">
              +{formatCurrency(Math.floor(REWARD_PER_COIN * MULTIPLIER))} per coin!
            </div>
            <div
              className="px-8 py-3 rounded-2xl font-black text-base text-black mt-2"
              style={{ background: 'linear-gradient(135deg, #FFD700, #FF8C00)' }}
            >
              TAP TO START!
            </div>
          </div>
        )}

        {/* DEAD OVERLAY — matches screenshot: NICE / SCORE / +COINS */}
        <AnimatePresence>
          {displayState === 'dead' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3"
              style={{ background: 'rgba(0,0,0,0.65)' }}
            >
              {woohoo ? (
                <div
                  className="font-black text-5xl tracking-wider"
                  style={{
                    background: 'linear-gradient(135deg, #22c55e, #60a5fa)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  NICE
                </div>
              ) : (
                <div className="text-white font-black text-4xl">
                  {deathScore === 0 ? 'OOPS!' : deathScore < 3 ? 'SO CLOSE!' : 'NICE'}
                </div>
              )}
              <div className="text-white/70 font-bold text-base tracking-widest">
                SCORE: {deathScore}
              </div>
              <div className="text-yellow-400 font-black text-2xl">
                +{rewardAmount} COINS
              </div>
              <div
                className="mt-4 px-8 py-3 rounded-2xl text-sm font-bold text-white/60"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                TAP TO PLAY AGAIN
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MULTIPLIER FOOTER */}
      <div
        className="flex items-center justify-center gap-2 py-3"
        style={{ background: 'rgba(255,255,255,0.04)', borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <span className="text-yellow-400 text-xs">⚡</span>
        <span className="text-yellow-400 text-xs font-bold tracking-wider">{MULTIPLIER}X MULTIPLIER</span>
      </div>
    </div>
  );
};

export default FlappyCoins;
