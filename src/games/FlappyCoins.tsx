// ============================================================
// DOPAMINE BOX - Flappy Coins
// Flappy Bird clone — flap through coins to score!
// "Woohoo!" celebration on high scores
// ============================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptic, sound, formatCurrency } from '../store/gameStore';

interface FlappyCoinsProps {
  balance: number;
  onResult: (delta: number, won: boolean) => void;
  onClose: () => void;
}

const CANVAS_W = 340;
const CANVAS_H = 420;
const BIRD_X = 80;
const BIRD_RADIUS = 18;
const GRAVITY = 0.45;
const FLAP_POWER = -8;
const PIPE_WIDTH = 50;
const PIPE_GAP = 130;
const PIPE_SPEED = 3.5;
const COIN_SIZE = 18;

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
  const animRef = useRef<number>(0);
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
    if (!state.started) {
      state.started = true;
      state.alive = true;
    }
    state.birdVY = FLAP_POWER;
    haptic.light();
    sound.playFlap();
  }, []);

  const draw = useCallback((ctx: CanvasRenderingContext2D, state: GameState) => {
    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    bg.addColorStop(0, '#0f0c29');
    bg.addColorStop(1, '#302b63');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    for (let i = 0; i < 30; i++) {
      const sx = ((i * 137 + state.frame * 0.2) % CANVAS_W);
      const sy = (i * 73) % CANVAS_H;
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }

    // Ground
    ctx.fillStyle = '#2d5016';
    ctx.fillRect(0, CANVAS_H - 20, CANVAS_W, 20);
    ctx.fillStyle = '#3d6b20';
    ctx.fillRect(0, CANVAS_H - 20, CANVAS_W, 5);

    // Pipes
    for (const pipe of state.pipes) {
      // Top pipe
      const pipeGrad = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
      pipeGrad.addColorStop(0, '#2dde2d');
      pipeGrad.addColorStop(0.5, '#45f545');
      pipeGrad.addColorStop(1, '#1a991a');
      ctx.fillStyle = pipeGrad;
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topH);
      // Pipe cap
      ctx.fillRect(pipe.x - 5, pipe.topH - 20, PIPE_WIDTH + 10, 20);

      // Bottom pipe
      const botY = pipe.topH + PIPE_GAP;
      ctx.fillStyle = pipeGrad;
      ctx.fillRect(pipe.x, botY, PIPE_WIDTH, CANVAS_H - botY - 20);
      // Pipe cap
      ctx.fillRect(pipe.x - 5, botY, PIPE_WIDTH + 10, 20);

      // Coin in gap
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
        
        // Glow
        ctx.save();
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(pipe.x + PIPE_WIDTH / 2, pipe.coinY, COIN_SIZE / 2, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,215,0,0.5)';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }
    }

    // Bird
    const birdColor = '#FFD700';
    ctx.save();
    ctx.translate(BIRD_X, state.birdY);
    // Rotate based on velocity
    ctx.rotate(Math.min(Math.max(state.birdVY * 0.05, -0.5), 0.8));
    
    // Bird body
    ctx.fillStyle = birdColor;
    ctx.beginPath();
    ctx.arc(0, 0, BIRD_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(6, -5, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(8, -5, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Wing
    ctx.fillStyle = '#FF8C00';
    ctx.beginPath();
    ctx.ellipse(-3, 4, 10, 5, Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#FF6B00';
    ctx.beginPath();
    ctx.moveTo(14, -2);
    ctx.lineTo(22, 0);
    ctx.lineTo(14, 4);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();

    // Score
    ctx.fillStyle = 'white';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.fillText(`🪙 ${state.coins}`, CANVAS_W / 2, 40);
    ctx.shadowBlur = 0;
  }, []);

  const gameLoop = useCallback(() => {
    const state = stateRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (state.alive && state.started) {
      // Physics
      state.birdVY += GRAVITY;
      state.birdY += state.birdVY;
      state.frame++;

      // Spawn pipes
      const lastPipe = state.pipes[state.pipes.length - 1];
      if (!lastPipe || lastPipe.x < CANVAS_W - 180) {
        state.pipes.push(spawnPipe(CANVAS_W + PIPE_WIDTH));
      }

      // Move pipes
      for (const pipe of state.pipes) {
        pipe.x -= PIPE_SPEED;

        // Check pass
        if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X - BIRD_RADIUS) {
          pipe.passed = true;
        }

        // Coin collision
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

        // Pipe collision
        const inPipeX = BIRD_X + BIRD_RADIUS > pipe.x && BIRD_X - BIRD_RADIUS < pipe.x + PIPE_WIDTH;
        const inTopPipe = state.birdY - BIRD_RADIUS < pipe.topH;
        const inBotPipe = state.birdY + BIRD_RADIUS > pipe.topH + PIPE_GAP;
        if (inPipeX && (inTopPipe || inBotPipe)) {
          state.alive = false;
        }
      }

      // Remove off-screen pipes
      state.pipes = state.pipes.filter(p => p.x > -PIPE_WIDTH - 20);

      // Ground/ceiling collision
      if (state.birdY + BIRD_RADIUS > CANVAS_H - 20 || state.birdY - BIRD_RADIUS < 0) {
        state.alive = false;
      }

      if (!state.alive) {
        // Game over
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

        if (earned > 0) {
          onResult(earned, won);
        }

        setRewardAmount(earned);
        setDisplayState('dead');
      }
    }

    draw(ctx, state);

    if (state.alive || !state.started) {
      animRef.current = requestAnimationFrame(gameLoop);
    } else {
      // Draw death state
      if (ctx) {
        draw(ctx, state);
        // Draw game over overlay
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
    <div className="flex flex-col items-center h-full overflow-y-auto pb-4">
      {/* Header */}
      <div className="w-full flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={onClose} className="text-2xl" style={{ background: 'none', border: 'none', color: '#fff' }}>✕</button>
        <h2 className="text-xl font-bold text-white">🐦 Flappy Coins</h2>
        <div className="text-green-400 font-bold text-sm">{formatCurrency(balance)}</div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 mb-3 px-4">
        <div className="px-3 py-1 rounded-lg text-center" style={{ background: 'rgba(255,215,0,0.15)', border: '1px solid rgba(255,215,0,0.3)' }}>
          <span className="text-yellow-400 font-black">{displayCoins} 🪙</span>
          <div className="text-gray-400 text-xs">COINS</div>
        </div>
        <div className="px-3 py-1 rounded-lg text-center" style={{ background: 'rgba(0,255,148,0.1)', border: '1px solid rgba(0,255,148,0.2)' }}>
          <span className="text-green-400 font-black">+{formatCurrency(displayCoins * REWARD_PER_COIN)}</span>
          <div className="text-gray-400 text-xs">REWARD</div>
        </div>
        <div className="px-3 py-1 rounded-lg text-center" style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.2)' }}>
          <span className="text-red-400 font-black">🏆 {displayBest}</span>
          <div className="text-gray-400 text-xs">BEST</div>
        </div>
      </div>

      {/* Game Canvas */}
      <div
        style={{ position: 'relative', cursor: 'pointer', userSelect: 'none' }}
        onClick={handleTap}
        onTouchStart={(e) => { e.preventDefault(); handleTap(); }}
      >
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{
            borderRadius: 16,
            display: 'block',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            maxWidth: '100%',
          }}
        />

        {/* Idle overlay */}
        {displayState === 'idle' && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)', borderRadius: 16,
          }}>
            <div style={{ fontSize: 48 }}>🐦</div>
            <div style={{ color: 'white', fontWeight: 900, fontSize: 22, marginTop: 8 }}>FLAPPY COINS</div>
            <div style={{ color: '#FFD700', fontSize: 14, marginTop: 4 }}>+{formatCurrency(REWARD_PER_COIN)} per coin!</div>
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              style={{
                marginTop: 16,
                padding: '10px 24px',
                background: 'linear-gradient(135deg, #FF6B6B, #FF8E53)',
                borderRadius: 50,
                color: 'white',
                fontWeight: 900,
                fontSize: 16,
              }}
            >
              TAP TO START!
            </motion.div>
          </div>
        )}
      </div>

      {/* Woohoo overlay */}
      <AnimatePresence>
        {woohoo && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 2, opacity: 0 }}
            style={{
              position: 'fixed',
              top: '30%',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1000,
              textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            <div style={{ fontSize: 60, lineHeight: 1 }}>🎉</div>
            <div style={{
              fontSize: 42,
              fontWeight: 900,
              color: '#FFD700',
              textShadow: '0 0 30px rgba(255,215,0,0.8)',
              fontFamily: 'Inter, sans-serif',
            }}>
              WOOHOO!
            </div>
            <div style={{ fontSize: 24, color: '#00FF94', fontWeight: 700 }}>
              +{formatCurrency(rewardAmount)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions */}
      {displayState === 'playing' && (
        <p className="text-gray-500 text-xs mt-3 text-center">
          Tap / click to flap • Collect 🪙 coins • Avoid the pipes!
        </p>
      )}
    </div>
  );
};

export default FlappyCoins;
