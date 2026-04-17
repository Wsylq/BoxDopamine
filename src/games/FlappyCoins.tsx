// ============================================================
// FLAPPY COINS GAME
// ============================================================
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptic, sound, formatCurrency } from '../store/gameStore';

const CANVAS_W = 320;
const CANVAS_H = 420;
const GRAVITY = 0.5;
const FLAP_POWER = -9;
const PIPE_SPEED = 2.5;
const PIPE_WIDTH = 52;
const PIPE_GAP = 130;
const BIRD_X = 70;
const BIRD_RADIUS = 18;
const COIN_SIZE = 22;

interface Pipe {
  x: number;
  topH: number;
  passed: boolean;
  hasCoin: boolean;
  coinY: number;
  coinCollected: boolean;
}

interface GameState {
  birdY: number;
  birdVY: number;
  pipes: Pipe[];
  coins: number;
  frame: number;
  alive: boolean;
  started: boolean;
  bestScore: number;
}

interface FlappyCoinsProps {
  balance: number;
  onResult: (delta: number, won: boolean) => void;
  onClose: () => void;
}

const FlappyCoins: React.FC<FlappyCoinsProps> = ({ balance, onResult, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>({
    birdY: CANVAS_H / 2,
    birdVY: 0,
    pipes: [],
    coins: 0,
    frame: 0,
    alive: false,
    started: false,
    bestScore: parseInt(localStorage.getItem('flappy_best') || '0'),
  });
  const animRef = useRef(0);
  const [displayState, setDisplayState] = useState<'idle' | 'playing' | 'dead'>('idle');
  const [displayCoins, setDisplayCoins] = useState(0);
  const [displayBest, setDisplayBest] = useState(parseInt(localStorage.getItem('flappy_best') || '0'));
  const [woohoo, setWoohoo] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(0);

  const REWARD_PER_COIN = Math.max(10, Math.floor(balance * 0.01));

  const spawnPipe = (x: number): Pipe => {
    const topH = 60 + Math.random() * (CANVAS_H - PIPE_GAP - 120);
    const coinY = topH + PIPE_GAP / 2;
    return { x, topH, passed: false, hasCoin: true, coinY, coinCollected: false };
  };

  const resetGame = () => {
    stateRef.current = {
      birdY: CANVAS_H / 2,
      birdVY: 0,
      pipes: [spawnPipe(CANVAS_W + 100)],
      coins: 0,
      frame: 0,
      alive: true,
      started: true,
      bestScore: stateRef.current.bestScore,
    };
    setDisplayCoins(0);
    setDisplayState('playing');
    setWoohoo(false);
  };

  const flap = useCallback(() => {
    const state = stateRef.current;
    if (!state.alive) {
      resetGame();
      return;
    }
    state.birdVY = FLAP_POWER;
    haptic.light();
    sound.playFlap();
  }, []);

  const draw = useCallback((ctx: CanvasRenderingContext2D, state: GameState) => {
    const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    bg.addColorStop(0, '#0f0c29');
    bg.addColorStop(1, '#302b63');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for (let i = 0; i < 30; i++) {
      const sx = ((i * 137 + state.frame * 0.2) % CANVAS_W);
      const sy = (i * 73) % CANVAS_H;
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }

    ctx.fillStyle = '#2d5016';
    ctx.fillRect(0, CANVAS_H - 20, CANVAS_W, 20);
    ctx.fillStyle = '#3d6b20';
    ctx.fillRect(0, CANVAS_H - 20, CANVAS_W, 5);

    for (const pipe of state.pipes) {
      const pipeGrad = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
      pipeGrad.addColorStop(0, '#2dde2d');
      pipeGrad.addColorStop(0.5, '#45f545');
      pipeGrad.addColorStop(1, '#1a991a');
      ctx.fillStyle = pipeGrad;
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topH);
      ctx.fillRect(pipe.x - 5, pipe.topH - 20, PIPE_WIDTH + 10, 20);

      const botY = pipe.topH + PIPE_GAP;
      ctx.fillStyle = pipeGrad;
      ctx.fillRect(pipe.x, botY, PIPE_WIDTH, CANVAS_H - botY - 20);
      ctx.fillRect(pipe.x - 5, botY, PIPE_WIDTH + 10, 20);

      if (pipe.hasCoin && !pipe.coinCollected) {
        ctx.save();
        ctx.translate(pipe.x + PIPE_WIDTH / 2, pipe.coinY);
        const spinAngle = (state.frame * 5) % 360;
        ctx.scale(Math.cos((spinAngle * Math.PI) / 180), 1);
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(0, 0, COIN_SIZE / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFA500';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 0);
        ctx.restore();
      }
    }

    ctx.save();
    ctx.translate(BIRD_X, state.birdY);
    ctx.rotate(Math.min(Math.max(state.birdVY * 0.05, -0.5), 0.8));
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(0, 0, BIRD_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(6, -5, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(8, -5, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FF8C00';
    ctx.beginPath();
    ctx.ellipse(-3, 4, 10, 5, Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FF6B00';
    ctx.beginPath();
    ctx.moveTo(14, -2);
    ctx.lineTo(22, 0);
    ctx.lineTo(14, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = 'white';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText(`🪙 ${state.coins}`, CANVAS_W / 2, 36);
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
      if (!lastPipe || lastPipe.x < CANVAS_W - 180) {
        state.pipes.push(spawnPipe(CANVAS_W + PIPE_WIDTH));
      }

      for (const pipe of state.pipes) {
        pipe.x -= PIPE_SPEED;
        if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X - BIRD_RADIUS) {
          pipe.passed = true;
        }
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
        const inTopPipe = state.birdY - BIRD_RADIUS < pipe.topH;
        const inBotPipe = state.birdY + BIRD_RADIUS > pipe.topH + PIPE_GAP;
        if (inPipeX && (inTopPipe || inBotPipe)) state.alive = false;
      }

      state.pipes = state.pipes.filter(p => p.x > -PIPE_WIDTH - 20);

      if (state.birdY + BIRD_RADIUS > CANVAS_H - 20 || state.birdY - BIRD_RADIUS < 0) {
        state.alive = false;
      }

      if (!state.alive) {
        haptic.lose();
        sound.playLose();
        const earned = state.coins * REWARD_PER_COIN;
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
        if (earned > 0) onResult(earned, won);
        setRewardAmount(earned);
        setDisplayState('dead');
      }
    }

    draw(ctx, state);

    if (state.alive || !state.started) {
      animRef.current = requestAnimationFrame(gameLoop);
    } else {
      draw(ctx, state);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', CANVAS_W / 2, CANVAS_H / 2 - 40);
      ctx.font = 'bold 22px Arial';
      ctx.fillStyle = '#FFD700';
      ctx.fillText(`🪙 ${state.coins} coins`, CANVAS_W / 2, CANVAS_H / 2);
      ctx.fillStyle = '#00FF94';
      ctx.font = '18px Arial';
      ctx.fillText(`Earned: ${formatCurrency(state.coins * REWARD_PER_COIN)}`, CANVAS_W / 2, CANVAS_H / 2 + 35);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '16px Arial';
      ctx.fillText('Tap to play again!', CANVAS_W / 2, CANVAS_H / 2 + 70);
    }
  }, [draw, REWARD_PER_COIN, onResult]);

  useEffect(() => {
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0a0a0a', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
        <div style={{ fontSize: 20, fontWeight: 900 }}>🐦 Flappy Coins</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#4ade80' }}>{formatCurrency(balance)}</div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 32, height: 32, color: '#fff', fontSize: 16, cursor: 'pointer' }}>✕</button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-around', padding: '0 20px 10px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#FFD700' }}>{displayCoins} 🪙</div>
          <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: 1 }}>Coins</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#4ade80' }}>+{formatCurrency(displayCoins * REWARD_PER_COIN)}</div>
          <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: 1 }}>Reward</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#a78bfa' }}>🏆 {displayBest}</div>
          <div style={{ fontSize: 10, color: '#666', textTransform: 'uppercase', letterSpacing: 1 }}>Best</div>
        </div>
      </div>

      <div
        style={{ display: 'flex', justifyContent: 'center', flex: 1, position: 'relative', cursor: 'pointer' }}
        onClick={handleTap}
        onTouchStart={e => { e.preventDefault(); handleTap(); }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
        />
        {displayState === 'idle' && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            <div style={{ fontSize: 60 }}>🐦</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#FFD700', letterSpacing: 2 }}>FLAPPY COINS</div>
            <div style={{ fontSize: 14, color: '#4ade80' }}>+{formatCurrency(REWARD_PER_COIN)} per coin!</div>
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              style={{
                marginTop: 10, padding: '12px 28px', borderRadius: 50,
                background: 'linear-gradient(135deg, #FFD700, #FF8C00)',
                color: '#000', fontWeight: 900, fontSize: 16, letterSpacing: 2,
              }}
            >
              TAP TO START!
            </motion.div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {woohoo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 100,
            }}
          >
            <div style={{ fontSize: 60 }}>🎉</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#FFD700' }}>WOOHOO!</div>
            <div style={{ fontSize: 22, color: '#4ade80', fontWeight: 700 }}>+{formatCurrency(rewardAmount)}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {displayState === 'playing' && (
        <div style={{ textAlign: 'center', padding: '8px 20px 20px', fontSize: 12, color: '#555' }}>
          Tap / click to flap • Collect 🪙 coins • Avoid the pipes!
        </div>
      )}
    </div>
  );
};

export default FlappyCoins;
