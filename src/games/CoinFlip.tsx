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
    <div className="flex flex-col items-center gap-6 px-4 py-6 h-full">
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
            className="text-center"
          >
            <div className={`text-3xl font-black ${won ? 'text-green-400 glow-green' : 'text-red-400 glow-red'}`}>
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
              transform: choice === s ? 'scale(1.03)' : 'scale(1)',
              boxShadow: choice === s
                ? s === 'heads' ? '0 4px 20px rgba(255,215,0,0.4)' : '0 4px 20px rgba(192,192,192,0.3)'
                : 'none',
            }}
          >
            {s === 'heads' ? '👑 Heads' : '🦅 Tails'}
          </button>
        ))}
      </div>

      {/* Bet selector */}
      <div className="w-full">
        <div className="text-white/50 text-xs font-semibold mb-2 uppercase tracking-wider">Bet Amount</div>
        <div className="grid grid-cols-4 gap-2">
          {BETS.map(b => (
            <button
              key={b}
              onClick={() => { setBet(b); haptics.light(); sounds.click(); }}
              disabled={b > balance}
              className="py-2 rounded-xl text-sm font-bold transition-all"
              style={{
                background: bet === b
                  ? 'linear-gradient(135deg,#FF6B6B,#FF8C00)'
                  : b > balance ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)',
                color: bet === b ? '#fff' : b > balance ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)',
                border: bet === b ? '1.5px solid rgba(255,107,107,0.5)' : '1.5px solid rgba(255,255,255,0.08)',
                transform: bet === b ? 'scale(1.05)' : 'scale(1)',
              }}
            >
              {formatCurrency(b)}
            </button>
          ))}
        </div>
      </div>

      {/* Balance */}
      <div className="text-white/40 text-sm">
        Balance: <span className="text-white font-bold">{formatCurrency(balance)}</span>
        {' · '}Betting: <span className="text-yellow-400 font-bold">{formatCurrency(safeBet)}</span>
      </div>

      {/* Action button */}
      {phase === 'idle' && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={flip}
          disabled={balance <= 0}
          className="w-full py-4 rounded-2xl text-xl font-black text-black"
          style={{
            background: balance <= 0 ? '#333' : 'linear-gradient(135deg, #FFD700, #FF8C00)',
            boxShadow: balance <= 0 ? 'none' : '0 4px 24px rgba(255,215,0,0.4)',
          }}
        >
          {balance <= 0 ? "You're Broke 💀" : `🪙 FLIP!`}
        </motion.button>
      )}

      {phase === 'result' && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.95 }}
          onClick={reset}
          className="w-full py-4 rounded-2xl text-xl font-black"
          style={{
            background: won ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'linear-gradient(135deg,#ef4444,#dc2626)',
            boxShadow: won ? '0 4px 24px rgba(34,197,94,0.4)' : '0 4px 24px rgba(239,68,68,0.4)',
          }}
        >
          {won ? '🎉 Flip Again!' : '😤 Revenge Flip!'}
        </motion.button>
      )}
    </div>
  );
}
