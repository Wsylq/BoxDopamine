import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { addBalance, formatCurrency, getState, sounds, haptics } from '../store/gameStore';

const BETS = [10, 25, 50, 100, 250, 500, 1000, 5000];

type Side = 'heads' | 'tails';
type Phase = 'idle' | 'flipping' | 'result';

export default function CoinFlip() {
  const [bet, setBet] = useState(50);
  const [choice, setChoice] = useState<Side>('heads');
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<Side | null>(null);
  const [won, setWon] = useState<boolean | null>(null);
  const [winAmount, setWinAmount] = useState(0);
  const [showLossEffect, setShowLossEffect] = useState(false);
  const flipCount = useRef(0);

  const { balance } = getState();

  function flip() {
    if (phase !== 'idle') return;
    const realBet = Math.min(bet, balance);
    if (balance <= 0) return;
    haptics.medium();
    sounds.flip();
    setPhase('flipping');
    setResult(null);
    setWon(null);

    const count = 8 + Math.floor(Math.random() * 6);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      sounds.flip();
      flipCount.current++;
      if (i >= count) {
        clearInterval(interval);
        const outcome: Side = Math.random() < 0.5 ? 'heads' : 'tails';
        const didWin = outcome === choice;
        setResult(outcome);
        setWon(didWin);
        setPhase('result');
        if (didWin) {
          addBalance(realBet);
          sounds.win();
          haptics.win();
          setWinAmount(realBet);
        } else {
          addBalance(-realBet);
          sounds.lose();
          haptics.lose();
          setWinAmount(-realBet);
          setShowLossEffect(true);
          setTimeout(() => setShowLossEffect(false), 600);
        }
      }
    }, 120);
  }

  function reset() {
    setPhase('idle');
    setResult(null);
    setWon(null);
  }

  const safeBet = Math.min(bet, balance);

  return (
    <div className="flex flex-col items-center gap-6 px-4 py-6 h-full" style={{ paddingBottom: 120 }}>
      {/* Red vignette on loss */}
      {showLossEffect && <div className="red-vignette" />}
      
      {/* Coin */}
      <div className="relative flex items-center justify-center" style={{ height: 160 }}>
        <motion.div
          animate={
            phase === 'flipping'
              ? { rotateY: [0, 1800], scale: [1, 1.1, 1] }
              : phase === 'result'
              ? { scale: [0.8, 1.1, 1] }
              : { scale: 1 }
          }
          transition={
            phase === 'flipping'
              ? { duration: 1.2, ease: 'easeInOut' }
              : { duration: 0.3 }
          }
          style={{
            width: 140,
            height: 140,
            borderRadius: '50%',
            background:
              result === 'tails'
                ? 'linear-gradient(135deg, #C0C0C0, #808080)'
                : 'linear-gradient(135deg, #FFD700, #FFA500)',
            boxShadow:
              result === 'tails'
                ? '0 0 30px rgba(192,192,192,0.5), inset 0 2px 8px rgba(255,255,255,0.3)'
                : '0 0 30px rgba(255,215,0,0.6), inset 0 2px 8px rgba(255,255,255,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 60,
            border: '4px solid rgba(255,255,255,0.2)',
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'visible',
          }}
        >
          {phase === 'flipping' ? '🪙' : result === 'tails' ? '🦅' : '👑'}
        </motion.div>

        <AnimatePresence>
          {phase === 'result' && won !== null && (
            <motion.div
              initial={{ scale: 0, y: -20, opacity: 0 }}
              animate={{ scale: 1, y: -80, opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`absolute text-2xl font-black ${won ? 'text-green-400' : 'text-red-400'}`}
              style={{ textShadow: won ? '0 0 20px #22c55e' : '0 0 20px #ef4444' }}
            >
              {won ? `+${formatCurrency(winAmount)}` : formatCurrency(winAmount)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Result text */}
      <AnimatePresence mode="wait">
        {phase === 'result' && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`text-center ${!won ? 'shake-intense' : ''}`}
          >
            <div className={`text-3xl font-black ${won ? 'text-green-400' : 'text-red-400'}`}>
              {won ? '🎉 YOU WIN!' : '💀 YOU LOSE'}
            </div>
            <div className="text-white/60 text-sm mt-1">
              {result === 'heads' ? '👑 Heads' : '🦅 Tails'}
            </div>
          </motion.div>
        )}
        {phase === 'flipping' && (
          <motion.div key="flip" className="text-white/60 text-lg font-semibold">
            Flipping...
          </motion.div>
        )}
        {phase === 'idle' && (
          <motion.div key="idle" className="text-white/40 text-sm">
            Pick a side and flip!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Choice */}
      <div className="flex gap-3 w-full">
        {(['heads', 'tails'] as Side[]).map(s => (
          <button
            key={s}
            onClick={() => { setChoice(s); haptics.light(); sounds.click(); }}
            className="flex-1 py-3 rounded-2xl font-bold text-base transition-all"
            style={{
              background: choice === s
                ? s === 'heads' ? 'linear-gradient(135deg,#FFD700,#FFA500)' : 'linear-gradient(135deg,#C0C0C0,#808080)'
                : 'rgba(255,255,255,0.08)',
              color: choice === s ? '#000' : '#fff',
              border: choice === s ? '2px solid rgba(255,255,255,0.4)' : '2px solid rgba(255,255,255,0.1)',
            }}
          >
            {s === 'heads' ? '👑 Heads' : '🦅 Tails'}
          </button>
        ))}
      </div>

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
                background: bet === b ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.06)',
                border: bet === b ? '1px solid rgba(255,215,0,0.5)' : '1px solid rgba(255,255,255,0.1)',
                color: bet === b ? '#FFD700' : 'rgba(255,255,255,0.5)',
              }}
            >
              {formatCurrency(b)}
            </button>
          ))}
        </div>
      </div>

      {/* Action button */}
      {phase === 'result' ? (
        <button
          onClick={reset}
          className="w-full py-4 rounded-2xl font-black text-lg"
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff',
          }}
        >
          Play Again
        </button>
      ) : (
        <button
          onClick={flip}
          disabled={phase !== 'idle' || balance <= 0}
          className="w-full py-4 rounded-2xl font-black text-lg transition-all"
          style={{
            background: phase !== 'idle' || balance <= 0
              ? 'rgba(255,255,255,0.05)'
              : 'linear-gradient(135deg, #FFD700, #FFA500)',
            color: phase !== 'idle' || balance <= 0 ? 'rgba(255,255,255,0.3)' : '#000',
            boxShadow: phase === 'idle' && balance > 0 ? '0 4px 20px rgba(255,215,0,0.4)' : 'none',
          }}
        >
          {phase === 'flipping' ? 'Flipping...' : `Flip for ${formatCurrency(safeBet)}`}
        </button>
      )}

      {balance <= 0 && (
        <div className="text-red-400 text-sm font-bold text-center">
          💀 Broke! Game over.
        </div>
      )}
    </div>
  );
}
