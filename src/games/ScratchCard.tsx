import { useState, useRef, useCallback, useEffect } from 'react';
import { addBalance, formatCurrency, getState, sounds, haptics } from '../store/gameStore';

const BETS = [10, 25, 50, 100, 250, 500];
const PRIZES = [0, 0, 0, 0.5, 1, 2, 5, 10, 25, 50, 100];

export default function ScratchCard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bet, setBet] = useState(50);
  const [scratching, setScratching] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [prize, setPrize] = useState<number | null>(null);
  const [scratchProgress, setScratchProgress] = useState(0);
  const [showLossEffect, setShowLossEffect] = useState(false);
  const isDrawingRef = useRef(false);
  const prizeRef = useRef<number>(0);

  const { balance } = getState();
  const safeBet = Math.min(bet, balance);

  const initCard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 300;
    canvas.height = 200;

    // Draw scratch-off layer
    const gradient = ctx.createLinearGradient(0, 0, 300, 200);
    gradient.addColorStop(0, '#C0C0C0');
    gradient.addColorStop(0.5, '#E8E8E8');
    gradient.addColorStop(1, '#A0A0A0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 300, 200);

    // Add texture
    for (let i = 0; i < 1000; i++) {
      ctx.fillStyle = `rgba(${Math.random() > 0.5 ? 255 : 0}, ${Math.random() > 0.5 ? 255 : 0}, ${Math.random() > 0.5 ? 255 : 0}, 0.1)`;
      ctx.fillRect(Math.random() * 300, Math.random() * 200, 2, 2);
    }

    // Add "SCRATCH HERE" text
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.font = 'bold 24px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('SCRATCH HERE', 150, 100);
    ctx.font = '14px system-ui';
    ctx.fillText('🎰', 150, 130);
  }, []);

  const startNewCard = useCallback(() => {
    if (balance < safeBet) return;
    
    // Pick random prize FIRST
    const selectedPrize = PRIZES[Math.floor(Math.random() * PRIZES.length)];
    prizeRef.current = selectedPrize;
    
    // Deduct bet
    addBalance(-safeBet);
    
    setScratching(false);
    setRevealed(false);
    setPrize(null);
    setScratchProgress(0);
    
    haptics.medium();
    sounds.click();
    
    // Redraw card after state updates
    requestAnimationFrame(() => {
      initCard();
    });
  }, [balance, safeBet, initCard]);

  useEffect(() => {
    // Initialize first card with a prize
    const selectedPrize = PRIZES[Math.floor(Math.random() * PRIZES.length)];
    prizeRef.current = selectedPrize;
    initCard();
  }, [initCard]);

  const scratch = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas || revealed) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = (x - rect.left) * scaleX;
    const canvasY = (y - rect.top) * scaleY;

    // Erase scratch area with larger radius
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(canvasX, canvasY, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // Calculate scratch progress - sample more frequently for accuracy
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let transparent = 0;
    let total = 0;
    
    // Sample every 20 pixels (better balance of performance and accuracy)
    for (let i = 3; i < pixels.length; i += 80) {
      total++;
      if (pixels[i] < 10) transparent++; // Only count fully transparent pixels
    }
    
    const progress = (transparent / total) * 100;
    setScratchProgress(progress);

    // Auto-reveal at 40% (lower threshold for better UX)
    if (progress > 40 && !revealed) {
      setRevealed(true);
      setPrize(prizeRef.current);
      
      const payout = Math.floor(safeBet * prizeRef.current);
      const delta = payout - safeBet;
      
      if (delta > 0) addBalance(payout);
      
      if (prizeRef.current >= 10) {
        haptics.win();
        sounds.bigWin();
      } else if (prizeRef.current >= 1) {
        haptics.win();
        sounds.win();
      } else {
        haptics.lose();
        sounds.lose();
        setShowLossEffect(true);
        setTimeout(() => setShowLossEffect(false), 600);
      }
    }

    if (!revealed) {
      haptics.light();
    }
  }, [revealed, safeBet]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (revealed) return;
    e.stopPropagation(); // Prevent scroll
    isDrawingRef.current = true;
    setScratching(true);
    scratch(e.clientX, e.clientY);
  }, [revealed, scratch]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawingRef.current || revealed) return;
    e.stopPropagation(); // Prevent scroll
    scratch(e.clientX, e.clientY);
  }, [revealed, scratch]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.stopPropagation(); // Prevent scroll
    isDrawingRef.current = false;
  }, []);

  // Touch handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (revealed) return;
    e.stopPropagation();
    isDrawingRef.current = true;
    setScratching(true);
    const touch = e.touches[0];
    scratch(touch.clientX, touch.clientY);
  }, [revealed, scratch]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDrawingRef.current || revealed) return;
    e.stopPropagation();
    e.preventDefault(); // Prevent scroll
    const touch = e.touches[0];
    scratch(touch.clientX, touch.clientY);
  }, [revealed, scratch]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    isDrawingRef.current = false;
  }, []);

  const getPrizeColor = (multiplier: number) => {
    if (multiplier >= 10) return '#22c55e';
    if (multiplier >= 2) return '#FFD700';
    if (multiplier >= 1) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-4 h-full">
      {/* Red vignette on loss */}
      {showLossEffect && <div className="red-vignette" />}
      
      {/* Card */}
      <div 
        className="relative" 
        style={{ width: 300, maxWidth: '100%' }}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        {/* Prize underneath */}
        {prize !== null && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl"
            style={{
              background: `linear-gradient(135deg, ${getPrizeColor(prize)}22, ${getPrizeColor(prize)}11)`,
              border: `2px solid ${getPrizeColor(prize)}44`,
            }}
          >
            <div className="text-6xl font-black" style={{ color: getPrizeColor(prize) }}>
              {prize}x
            </div>
            <div className="text-white/60 text-sm mt-2">
              {prize >= 1 ? `Win ${formatCurrency(Math.floor(safeBet * prize))}` : 'No Win'}
            </div>
          </div>
        )}
        
        {/* Scratch canvas */}
        <canvas
          ref={canvasRef}
          className="rounded-2xl"
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            cursor: scratching ? 'grabbing' : 'grab',
            touchAction: 'none',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
      </div>

      {/* Progress */}
      {scratching && !revealed && (
        <div className="w-full max-w-xs">
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${scratchProgress}%`,
                background: 'linear-gradient(90deg, #FFD700, #FF8C00)',
              }}
            />
          </div>
          <div className="text-white/40 text-xs text-center mt-1">
            {scratchProgress.toFixed(0)}% revealed
          </div>
        </div>
      )}

      {/* Result */}
      {revealed && prize !== null && (
        <div className={`text-center ${prize < 1 ? 'shake-intense' : ''}`}>
          <div className={`text-2xl font-black`} style={{ color: getPrizeColor(prize) }}>
            {prize >= 1 ? `🎉 +${formatCurrency(Math.floor(safeBet * prize) - safeBet)}` : '💀 No Win'}
          </div>
          <div className="text-white/40 text-xs">{prize}x multiplier</div>
        </div>
      )}

      {!scratching && !revealed && (
        <div className="text-white/40 text-sm">
          Scratch to reveal your prize!
        </div>
      )}

      {/* Bet selector */}
      {!scratching && (
        <div className="w-full">
          <div className="text-white/40 text-xs mb-2 text-center">BET AMOUNT</div>
          <div className="flex flex-wrap gap-2 justify-center">
            {BETS.map(b => (
              <button
                key={b}
                onClick={() => { setBet(b); haptics.light(); sounds.click(); }}
                disabled={revealed}
                className="px-3 py-1.5 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: bet === b ? 'rgba(192,192,192,0.2)' : 'rgba(255,255,255,0.06)',
                  border: bet === b ? '1px solid rgba(192,192,192,0.5)' : '1px solid rgba(255,255,255,0.1)',
                  color: bet === b ? '#C0C0C0' : 'rgba(255,255,255,0.5)',
                  opacity: revealed ? 0.5 : 1,
                }}
              >
                {formatCurrency(b)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action button */}
      <button
        onClick={startNewCard}
        disabled={balance <= 0}
        className="w-full py-4 rounded-2xl font-black text-lg transition-all"
        style={{
          background: balance <= 0
            ? 'rgba(255,255,255,0.05)'
            : 'linear-gradient(135deg, #C0C0C0, #A0A0A0)',
          color: balance <= 0 ? 'rgba(255,255,255,0.3)' : '#000',
          boxShadow: balance > 0 ? '0 4px 20px rgba(192,192,192,0.4)' : 'none',
        }}
      >
        {revealed ? 'New Card' : `Buy Card — ${formatCurrency(safeBet)}`}
      </button>

      {balance <= 0 && (
        <div className="text-red-400 text-sm font-bold text-center">
          💀 Broke! Game over.
        </div>
      )}
    </div>
  );
}
