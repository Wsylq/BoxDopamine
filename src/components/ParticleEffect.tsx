import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  colorIndex: number;
  size: number;
}

interface Props {
  active: boolean;
  originX?: number;
  originY?: number;
}

const COLORS = ['#FFD700', '#FF6B6B', '#00FF94', '#a78bfa', '#38bdf8', '#fb923c'];

export default function ParticleEffect({ active, originX = 0.5, originY = 0.15 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const W = canvas.width = window.innerWidth;
    const H = canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d', { alpha: true })!;

    const startX = W * originX;
    const startY = H * originY;

    // Reduced from 80 to 40 particles
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 8;
      particlesRef.current.push({
        x: startX,
        y: startY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        life: 1,
        maxLife: 60 + Math.random() * 60,
        colorIndex: Math.floor(Math.random() * COLORS.length),
        size: 3 + Math.random() * 6,
      });
    }

    function animate() {
      ctx.clearRect(0, 0, W, H);
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);

      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life -= 1 / p.maxLife;

        ctx.globalAlpha = p.life;
        ctx.fillStyle = COLORS[p.colorIndex];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;

      if (particlesRef.current.length > 0) {
        animRef.current = requestAnimationFrame(animate);
      }
    }

    animRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animRef.current);
      particlesRef.current = [];
    };
  }, [active, originX, originY]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  );
}
