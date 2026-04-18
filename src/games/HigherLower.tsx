import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { addBalance, formatCurrency, getState, sounds, haptics } from '../store/gameStore';

const SUITS = ['♠', '♥', '♦', '♣'];
const VALUES = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

function randomCard() {
  return {
    suit: SUITS[Math.floor(Math.random() * 4)],
    value: VALUES[Math.floor(Math.random() * 13)],
    num: Math.floor(Math.random() * 13),
  };
}

const BETS = [10, 25, 50, 100, 250, 500];
const MULTIPLIERS = [2, 4, 8, 16, 32, 64];

type Phase = 'idle' | 'playing' | 'cashed' | 'lost';

export default function HigherLower() {
  const [bet, setBet] = useState(50);
  const [phase, setPhase] = useState<Phase>('idle');
  const [currentCard, setCurrentCard] = useState(randomCard());
  const [nextCard, setNextCard] = useState<typeof currentCard | null>(null);
  const [streak, setStreak] = useState(0);
  const [pot, setPot] = useState(0);
  const [showNext, setShowNext] = useState(false);
  const [showLossEffect, setShowLossEffect] = useState(false);

  const { balance } = getState();
  const currentPot = streak === 0 ? Math.min(bet, balance) : pot;

  function startGame() {
    const realBet = Math.min(bet, balance);
    addBalance(-realBet);
    setPot(realBet);
    setStreak(0);
    setCurrentCard(randomCard());
    setNextCard(null);
    setShowNext(false);
    setPhase('playing');
    sounds.click();
    haptics.medium();
  }

  function guess(dir: 'higher' | 'lower') {
    if (phase !== 'playing') return;
    const next = randomCard();
    setNextCard(next);
    setShowNext(true);
    haptics.medium();
    sounds.flip();

    setTimeout(() => {
      const correct =
        dir === 'higher' ? next.num >= currentCard.num : next.num <= currentCard.num;

      if (correct) {
        const newStreak = streak + 1;
        const newPot = currentPot * 2;
        setStreak(newStreak);
        setPot(newPot);
        setCurrentCard(next);
        setNextCard(null);
        setShowNext(false);
        sounds.win();
        haptics.win();
      } else {
        setPhase('lost');
        sounds.lose();
        haptics.lose();
        setShowLossEffect(true);
        setTimeout(() => setShowLossEffect(false), 600);
      }
    }, 800);
  }

  function cashOut() {
    if (phase !== 'playing' || streak === 0) return;
    addBalance(currentPot);
    setPhase('cashed');
    sounds.bigWin();
    haptics.win();
  }

  function reset() {
    setPhase('idle');
    setCurrentCard(randomCard());
    setNextCard(null);
    setShowNext(false);
    setStreak(0);
    setPot(0);
  }

  const isRed = (card: typeof currentCard) => card.suit === '♥' || card.suit === '♦';

  return (
    <div className="flex flex-col items-center gap-5 px-4 py-6 h-full" style={{ paddingBottom: 120 }}>
      {/* Red vignette on loss */}
      {showLossEffect && <div className="red-vignette" />}
      
      {/* Streak / Multiplier bar */}
      <div className="flex gap-3 w-full justify-center">
        {MULTIPLIERS.map((m, i) => (
          <div key={m} className="flex flex-col items-center gap-1">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-all"
              style={{
                background: i < streak
                  ? 'linear-gradient(135deg,#22c55e,#16a34a)'
                  : i === streak && phase === 'playing'
                  ? 'linear-gradient(135deg,#FFD700,#FF8C00)'
                  : 'rgba(255,255,255,0.08)',
                color: i <= streak ? '#fff' : 'rgba(255,255,255,0.3)',
                boxShadow: i === streak && phase === 'playing' ? '0 0 12px rgba(255,215,0,0.5)' : 'none',
                transform: i === streak && phase === 'playing' ? 'scale(1.15)' : 'scale(1)',
              }}
            >
              {m}x
            </div>
          </div>
        ))}
      </div>

      {/* Cards area */}
      <div className="flex items-center justify-center gap-4 w-full" style={{ minHeight: 160 }}>
        {/* Current card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentCard.value + currentCard.suit}
            initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            className="relative"
            style={{
              width: 110, height: 155, borderRadius: 16,
              background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
              border: '2px solid rgba(255,255,255,0.15)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column',
            }}
          >
            <div className="text-5xl font-black" style={{ color: isRed(currentCard) ? '#ef4444' : '#fff' }}>
              {currentCard.value}
            </div>
            <div className="text-2xl" style={{ color: isRed(currentCard) ? '#ef4444' : '#fff' }}>
              {currentCard.suit}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="text-3xl text-white/30">→</div>

        {/* Next card */}
        <div
          style={{
            width: 110, height: 155, borderRadius: 16,
            background: showNext && nextCard
              ? 'linear-gradient(135deg, #1a1a2e, #16213e)'
              : 'rgba(255,255,255,0.05)',
            border: '2px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column',
          }}
        >
          {showNext && nextCard ? (
            <>
              <div className="text-5xl font-black" style={{ color: isRed(nextCard) ? '#ef4444' : '#fff' }}>
                {nextCard.value}
              </div>
              <div className="text-2xl" style={{ color: isRed(nextCard) ? '#ef4444' : '#fff' }}>
                {nextCard.suit}
              </div>
            </>
          ) : (
            <div className="text-4xl">🂠</div>
          )}
        </div>
      </div>

      {/* Pot display */}
      {(phase === 'playing' || phase === 'cashed') && (
        <div className="text-center">
          <div className="text-white/40 text-xs">CURRENT POT</div>
          <div className="text-3xl font-black text-yellow-400">{formatCurrency(currentPot)}</div>
          {streak > 0 && <div className="text-white/40 text-xs">{MULTIPLIERS[Math.min(streak - 1, 5)]}x multiplier!</div>}
        </div>
      )}

      {/* Result messages */}
      <AnimatePresence>
        {phase === 'cashed' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="text-3xl font-black text-green-400">💰 CASHED OUT!</div>
            <div className="text-white/60 text-sm">{formatCurrency(currentPot)} secured</div>
          </motion.div>
        )}
        {phase === 'lost' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center shake-intense"
          >
            <div className="text-3xl font-black text-red-400">💀 WRONG!</div>
            <div className="text-white/60 text-sm">Lost everything</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bet selector (idle only) */}
      {phase === 'idle' && (
        <div className="w-full">
          <div className="text-white/40 text-xs mb-2 text-center">BET AMOUNT</div>
          <div className="flex flex-wrap gap-2 justify-center">
            {BETS.map(b => (
              <button
                key={b}
                onClick={() => { setBet(b); haptics.light(); sounds.click(); }}
                className="px-3 py-1.5 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: bet === b ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.06)',
                  border: bet === b ? '1px solid rgba(167,139,250,0.5)' : '1px solid rgba(255,255,255,0.1)',
                  color: bet === b ? '#a78bfa' : 'rgba(255,255,255,0.5)',
                }}
              >
                {formatCurrency(b)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {phase === 'idle' && (
        <button
          onClick={startGame}
          disabled={balance <= 0}
          className="w-full py-4 rounded-2xl font-black text-lg"
          style={{
            background: balance > 0 ? 'linear-gradient(135deg, #a78bfa, #7c3aed)' : 'rgba(255,255,255,0.05)',
            color: balance > 0 ? '#fff' : 'rgba(255,255,255,0.3)',
            boxShadow: balance > 0 ? '0 4px 20px rgba(167,139,250,0.4)' : 'none',
          }}
        >
          Start — {formatCurrency(Math.min(bet, balance))}
        </button>
      )}

      {phase === 'playing' && (
        <div className="flex flex-col gap-3 w-full">
          <div className="flex gap-3">
            <button
              onClick={() => guess('higher')}
              disabled={showNext}
              className="flex-1 py-3 rounded-2xl font-black text-base"
              style={{
                background: showNext ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#22c55e,#16a34a)',
                color: showNext ? 'rgba(255,255,255,0.3)' : '#fff',
              }}
            >
              ↑ Higher
            </button>
            <button
              onClick={() => guess('lower')}
              disabled={showNext}
              className="flex-1 py-3 rounded-2xl font-black text-base"
              style={{
                background: showNext ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#ef4444,#dc2626)',
                color: showNext ? 'rgba(255,255,255,0.3)' : '#fff',
              }}
            >
              ↓ Lower
            </button>
          </div>
          {streak > 0 && (
            <button
              onClick={cashOut}
              disabled={showNext}
              className="w-full py-3 rounded-2xl font-black text-base"
              style={{
                background: 'rgba(255,215,0,0.15)',
                border: '1px solid rgba(255,215,0,0.4)',
                color: '#FFD700',
              }}
            >
              💰 Cash Out {formatCurrency(currentPot)}
            </button>
          )}
        </div>
      )}

      {(phase === 'cashed' || phase === 'lost') && (
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
      )}
    </div>
  );
}
