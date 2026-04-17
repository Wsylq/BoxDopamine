// ============================================================
// DOPAMINE BOX - Coin Flip Game
// Double or Nothing with "Double Down?" mechanic
// ============================================================
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptic, sound, formatCurrency } from '../store/gameStore';

type CoinSide = 'heads' | 'tails';
type GameState = 'betting' | 'flipping' | 'result' | 'doubledown';

const BET_OPTIONS = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000];

interface CoinFlipProps {
  balance: number;
  onResult: (delta: number, won: boolean) => void;
  onClose: () => void;
}

const CoinFlip: React.FC<CoinFlipProps> = ({ balance, onResult, onClose }) => {
  const [bet, setBet] = useState(25);
  const [side, setSide] = useState<CoinSide>('heads');
  const [gameState, setGameState] = useState<GameState>('betting');
  const [isFlipping, setIsFlipping] = useState(false);
  const [result, setResult] = useState<CoinSide | null>(null);
  const [won, setWon] = useState<boolean | null>(null);
  const [_totalWinnings, setTotalWinnings] = useState(0);
  const [doubleCount, setDoubleCount] = useState(0);

  const safeBet = Math.min(bet, balance);

  const flip = (currentBet: number, isDoubleDown = false) => {
    setIsFlipping(true);
    setGameState('flipping');
    haptic.medium();
    sound.playClick();

    setTimeout(() => {
      const outcome: CoinSide = Math.random() < 0.5 ? 'heads' : 'tails';
      setResult(outcome);
      const didWin = outcome === side;

      if (didWin) {
        const winAmount = isDoubleDown ? currentBet : currentBet;
        setTotalWinnings(prev => prev + winAmount);
        haptic.win();
        sound.playWin();
        setWon(true);
        setIsFlipping(false);
        // Offer double down after winning
        setTimeout(() => {
          setGameState('doubledown');
        }, 600);
      } else {
        haptic.lose();
        sound.playLose();
        setWon(false);
        setIsFlipping(false);
        const loss = isDoubleDown ? currentBet : currentBet;
        onResult(-loss, false);
        setTimeout(() => setGameState('result'), 400);
      }
    }, 1200);
  };

  const handleFlip = () => {
    if (balance < safeBet) return;
    setTotalWinnings(0);
    setDoubleCount(0);
    onResult(-safeBet, false); // deduct first
    flip(safeBet);
  };

  const handleDoubleDown = () => {
    const newBet = safeBet * Math.pow(2, doubleCount + 1);
    if (balance < newBet) {
      // Can't afford, just cash out
      handleCashOut();
      return;
    }
    setDoubleCount(c => c + 1);
    haptic.heavy();
    sound.playCardFlip();
    onResult(-newBet, false); // deduct doubled bet
    flip(newBet, true);
  };

  const handleCashOut = () => {
    // They already banked the win from the initial flip result chain
    const finalWin = safeBet * Math.pow(2, doubleCount + 1);
    onResult(finalWin, true);
    haptic.success();
    sound.playWin();
    setGameState('result');
    setWon(true);
  };

  const reset = () => {
    setGameState('betting');
    setResult(null);
    setWon(null);
    setIsFlipping(false);
    setTotalWinnings(0);
    setDoubleCount(0);
    haptic.light();
  };

  const potentialWin = safeBet * Math.pow(2, doubleCount + 1);

  return (
    <div className="flex flex-col h-full bg-black text-white select-none">
      {/* TOP BAR */}
      <div className="flex items-center justify-between px-5 pt-14 pb-2">
        <span className="text-green-400 font-bold text-lg">${balance.toFixed(0)}</span>
        <span className="text-white/40 text-xs tracking-widest uppercase">Double or Nothing</span>
        <button onClick={onClose} className="text-white/50 text-2xl leading-none">×</button>
      </div>

      {/* BET DISPLAY */}
      {gameState !== 'betting' && (
        <div className="flex items-center justify-center gap-6 px-5 py-1">
          <div className="text-center">
            <div className="text-white/40 text-xs">BET</div>
            <div className="text-yellow-400 font-bold">{formatCurrency(safeBet)}</div>
          </div>
          <div className="text-center">
            <div className="text-white/40 text-xs">WIN</div>
            <div className="text-green-400 font-bold">{formatCurrency(potentialWin)}</div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">

        {/* COIN */}
        <AnimatePresence mode="wait">
          {(gameState === 'flipping' || gameState === 'result' || gameState === 'doubledown') && (
            <motion.div
              key="coin"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative mb-8"
            >
              <motion.div
                animate={isFlipping ? {
                  rotateY: [0, 360, 720, 1080],
                  scale: [1, 1.1, 1, 1.1, 1],
                } : { rotateY: 0 }}
                transition={isFlipping ? { duration: 1.2, ease: 'easeInOut' } : { duration: 0.3 }}
                style={{ transformStyle: 'preserve-3d' }}
                className="w-36 h-36 rounded-full"
              >
                {/* Coin face */}
                <div
                  className="w-36 h-36 rounded-full flex items-center justify-center text-5xl shadow-2xl"
                  style={{
                    background: 'radial-gradient(circle at 35% 35%, #FFE066, #FFD700 45%, #CC9900 80%, #997700)',
                    boxShadow: '0 0 40px rgba(255,215,0,0.5), inset 0 4px 8px rgba(255,255,255,0.4), inset 0 -4px 8px rgba(0,0,0,0.3)',
                  }}
                >
                  <span style={{
                    fontSize: '2.5rem',
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
                    color: '#7a5c00',
                    fontWeight: 900,
                    fontFamily: 'serif',
                  }}>$</span>
                </div>
              </motion.div>

              {/* Result badge */}
              <AnimatePresence>
                {won !== null && !isFlipping && (
                  <motion.div
                    initial={{ scale: 0, y: 10 }}
                    animate={{ scale: 1, y: 0 }}
                    className="absolute -bottom-3 left-1/2 -translate-x-1/2"
                  >
                    <div className={`px-4 py-1 rounded-full text-sm font-black ${won ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                      {result?.toUpperCase()}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FLIPPING STATE */}
        {gameState === 'flipping' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4"
          >
            <div className="px-8 py-3 rounded-2xl text-white/60 text-base font-semibold tracking-wider"
              style={{
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}>
              FLIPPING...
            </div>
          </motion.div>
        )}

        {/* DOUBLE DOWN STATE */}
        {gameState === 'doubledown' && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-5 w-full max-w-xs"
            >
              <div className="text-center">
                <div className="text-red-400 text-xs font-bold tracking-widest mb-1">MAXIMUM RISK</div>
                <div className="text-white font-black text-4xl tracking-tight">DOUBLE DOWN?</div>
                <div className="text-white/50 text-sm mt-1">One big win could get it all back</div>
              </div>

              <button
                onClick={handleDoubleDown}
                className="w-full py-4 rounded-2xl font-black text-lg text-white tracking-wide"
                style={{
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  boxShadow: '0 4px 30px rgba(34,197,94,0.4)',
                }}
              >
                BET {formatCurrency(safeBet * Math.pow(2, doubleCount + 1))}
              </button>

              <button
                onClick={handleCashOut}
                className="w-full py-3 rounded-2xl font-bold text-base text-white/70 tracking-wide"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                TAKE {formatCurrency(safeBet * Math.pow(2, doubleCount + 1))} ✓
              </button>
            </motion.div>
          </AnimatePresence>
        )}

        {/* RESULT STATE */}
        {gameState === 'result' && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4"
            >
              <div className={`text-5xl font-black tracking-tight ${won ? 'text-green-400' : 'text-red-500'}`}
                style={{ textShadow: won ? '0 0 30px rgba(34,197,94,0.6)' : '0 0 30px rgba(239,68,68,0.6)' }}>
                {won ? 'WIN!' : 'WRONG!'}
              </div>
              <div className={`text-lg font-bold ${won ? 'text-green-300' : 'text-red-300'}`}>
                {won ? `+${formatCurrency(potentialWin)}` : `-${formatCurrency(safeBet)}`}
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {/* BETTING STATE */}
        {gameState === 'betting' && (
          <div className="flex flex-col items-center gap-8 w-full">
            {/* Side picker */}
            <div className="flex flex-col items-center gap-3 w-full">
              <div className="text-white/40 text-xs tracking-widest uppercase">Pick Your Side</div>
              <div className="flex gap-3 w-full max-w-xs">
                {(['heads', 'tails'] as CoinSide[]).map(s => (
                  <button
                    key={s}
                    onClick={() => { setSide(s); haptic.light(); }}
                    className="flex-1 py-4 rounded-2xl font-black text-base uppercase tracking-wider transition-all"
                    style={{
                      background: side === s
                        ? 'linear-gradient(135deg, #FFD700, #FF8C00)'
                        : 'rgba(255,255,255,0.08)',
                      color: side === s ? '#000' : 'rgba(255,255,255,0.6)',
                      border: side === s ? 'none' : '1px solid rgba(255,255,255,0.12)',
                      boxShadow: side === s ? '0 4px 20px rgba(255,215,0,0.4)' : 'none',
                    }}
                  >
                    {s === 'heads' ? '😎 Heads' : '💀 Tails'}
                  </button>
                ))}
              </div>
            </div>

            {/* Bet grid */}
            <div className="flex flex-col items-center gap-3 w-full">
              <div className="text-white/40 text-xs tracking-widest uppercase">Choose Bet</div>
              <div className="grid grid-cols-3 gap-2 w-full max-w-xs">
                {BET_OPTIONS.filter(b => b <= balance + 1).map(amount => (
                  <button
                    key={amount}
                    onClick={() => { setBet(amount); haptic.light(); }}
                    className="py-3 rounded-xl font-bold text-sm transition-all"
                    style={{
                      background: bet === amount
                        ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                        : 'rgba(255,255,255,0.08)',
                      color: bet === amount ? '#fff' : 'rgba(255,255,255,0.6)',
                      border: bet === amount ? 'none' : '1px solid rgba(255,255,255,0.1)',
                      boxShadow: bet === amount ? '0 2px 12px rgba(34,197,94,0.35)' : 'none',
                    }}
                  >
                    ${amount.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM BUTTON */}
      <div className="px-6 pb-10 pt-4">
        {gameState === 'betting' && (
          <button
            onClick={handleFlip}
            disabled={balance < safeBet}
            className="w-full py-4 rounded-2xl font-black text-lg text-white tracking-wider"
            style={{
              background: 'linear-gradient(135deg, #FFD700, #FF8C00)',
              color: '#000',
              boxShadow: '0 4px 30px rgba(255,165,0,0.5)',
              opacity: balance < safeBet ? 0.5 : 1,
            }}
          >
            FLIP — {formatCurrency(safeBet)}
          </button>
        )}
        {gameState === 'result' && (
          <button
            onClick={reset}
            className="w-full py-4 rounded-2xl font-black text-lg"
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white',
            }}
          >
            FLIP AGAIN
          </button>
        )}
      </div>
    </div>
  );
};

export default CoinFlip;
