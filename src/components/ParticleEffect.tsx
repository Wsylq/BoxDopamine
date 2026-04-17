import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; color: string;
  size: number; shape: 'circle' | 'star' | 'coin';
  rotation: number; rotSpeed: number;
}

interface ParticleEffectProps {
  active: boolean;
  x?: number;
  y?: number;
  count?: number;
  colors?: string[];
}

const DEFAULT_COLORS = [
  '#FFD700','#FF6B6B','#4ECDC4','#45B7D1','#96CEB4',
  '#FFEAA7','#DDA0DD','#98FB98','#FF69B4','#FFA07A',
  '#00CED1','#FF8C00',
];

const ParticleEffect: React.FC<ParticleEffectProps> = ({
  active, x, y, count = 80, colors = DEFAULT_COLORS,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);

  const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, rot: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const x2 = Math.cos(angle) * r;
      const y2 = Math.sin(angle) * r;
      i === 0 ? ctx.moveTo(x2, y2) : ctx.lineTo(x2, y2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  const createParticles = (cx: number, cy: number) => {
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (Math.random() * Math.PI * 2);
      const speed = 2 + Math.random() * 8;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        life: 1,
        maxLife: 0.008 + Math.random() * 0.006,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 8,
        shape: ['circle', 'star', 'coin'][Math.floor(Math.random() * 3)] as 'circle' | 'star' | 'coin',
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2,
      });
    }
    particlesRef.current = particles;
  };

  const animate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);
    for (const p of particlesRef.current) {
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.3; p.vx *= 0.99;
      p.life -= p.maxLife; p.rotation += p.rotSpeed;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      if (p.shape === 'circle') {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2); ctx.fill();
      } else if (p.shape === 'star') {
        drawStar(ctx, p.x, p.y, p.size / 2, p.rotation);
      } else {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rotation);
        ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = `bold ${p.size * 0.7}px sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('$', 0, 0); ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
    if (particlesRef.current.length > 0) {
      animFrameRef.current = requestAnimationFrame(animate);
    }
  };

  useEffect(() => {
    if (active) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const cx = x ?? window.innerWidth / 2;
      const cy = y ?? window.innerHeight / 3;
      createParticles(cx, cy);
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [active]);

  if (!active && particlesRef.current.length === 0) return null;
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', top: 0, left: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 9999,
      }}
    />
  );
};

export default ParticleEffect;
