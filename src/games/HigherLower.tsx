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
    <div className="flex flex-col items-center gap-5 px-4 py-6 h-full">
      {/* Streak / Multiplier bar */}
      <div className="flex gap-3 w-full justify-center">
        {MULTIPLIERS.map((m, i) => (
          <div
            key={m}
            className="flex flex-col items-center gap-1"
          >
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
              width: 110,
              height: 155,
              borderRadius: 16,
              background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
              border: '2px solid rgba(255,255,255,0.15)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
            }}
          >
            <div
              className="text-5xl font-black"
              style={{ color: isRed(currentCard) ? '#ef4444' : '#fff' }}
            >
              {currentCard.value}
            </div>
            <div
              className="text-2xl"
              style={{ color: isRed(currentCard) ? '#ef4444' : '#fff' }}
            >
              {currentCard.suit}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="text-3xl text-white/30">→</div>

        {/* Next card */}
        <div
          style={{
            width: 110,
            height: 155,
            borderRadius: 16,
            background: showNext && nextCard
              ? 'linear-gradient(135deg, #1a1a2e, #16213e)'
              : 'rgba(255,255,255,0.05)',
            border: '2px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
          }}
        >
          {showNext && nextCard ? (
            <motion.div
              initial={{ opacity: 0, rotateY: -90 }}
              animate={{ opacity: 1, rotateY: 0 }}
              className="flex flex-col items-center"
            >
              <div
                className="text-5xl font-black"
                style={{ color: isRed(nextCard) ? '#ef4444' : '#fff' }}
              >
                {nextCard.value}
              </div>
              <div
                className="text-2xl"
                style={{ color: isRed(nextCard) ? '#ef4444' : '#fff' }}
              >
                {nextCard.suit}
              </div>
            </motion.div>
          ) : (
            <div className="text-4xl opacity-20">🃏</div>
          )}
        </div>
      </div>

      {/* Pot display */}
      {phase === 'playing' && (
        <motion.div
          key={currentPot}
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="text-center"
        >
          <div className="text-white/50 text-xs uppercase tracking-wider">Current Pot</div>
          <div className="text-3xl font-black gold-text">{formatCurrency(currentPot)}</div>
          {streak > 0 && (
            <div className="text-green-400 text-sm font-semibold">
              🔥 {streak} in a row!
            </div>
          )}
        </motion.div>
      )}

      {/* Idle bet selector */}
      {phase === 'idle' && (
        <>
          <div className="w-full">
            <div className="text-white/50 text-xs font-semibold mb-2 uppercase tracking-wider">Bet Amount</div>
            <div className="grid grid-cols-3 gap-2">
              {BETS.map(b => (
                <button
                  key={b}
                  onClick={() => { setBet(b); haptics.light(); sounds.click(); }}
                  disabled={b > balance}
                  className="py-2 rounded-xl text-sm font-bold"
                  style={{
                    background: bet === b
                      ? 'linear-gradient(135deg,#a78bfa,#7c3aed)'
                      : b > balance ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.08)',
                    color: bet === b ? '#fff' : b > balance ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)',
                    border: bet === b ? '1.5px solid rgba(167,139,250,0.4)' : '1.5px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {formatCurrency(b)}
                </button>
              ))}
            </div>
          </div>
          <div className="text-white/40 text-sm">Balance: <span className="text-white font-bold">{formatCurrency(balance)}</span></div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={startGame}
            disabled={balance <= 0}
            className="w-full py-4 rounded-2xl text-xl font-black text-white"
            style={{
              background: 'linear-gradient(135deg, #a78bfa, #7c3aed)',
              boxShadow: '0 4px 24px rgba(167,139,250,0.4)',
            }}
          >
            🃏 DEAL
          </motion.button>
        </>
      )}

      {/* Playing controls */}
      {phase === 'playing' && (
        <div className="w-full flex flex-col gap-3">
          <div className="flex gap-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => guess('higher')}
              className="flex-1 py-4 rounded-2xl text-lg font-black text-white"
              style={{
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                boxShadow: '0 4px 20px rgba(34,197,94,0.4)',
              }}
            >
              ↑ HIGHER
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => guess('lower')}
              className="flex-1 py-4 rounded-2xl text-lg font-black text-white"
              style={{
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                boxShadow: '0 4px 20px rgba(239,68,68,0.4)',
              }}
            >
              ↓ LOWER
            </motion.button>
          </div>
          {streak > 0 && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileTap={{ scale: 0.95 }}
              onClick={cashOut}
              className="w-full py-3 rounded-2xl text-base font-bold"
              style={{
                background: 'linear-gradient(135deg, #FFD700, #FF8C00)',
                color: '#000',
                boxShadow: '0 4px 20px rgba(255,215,0,0.4)',
              }}
            >
              💰 Cash Out {formatCurrency(currentPot)}
            </motion.button>
          )}
        </div>
      )}

      {/* End states */}
      {(phase === 'cashed' || phase === 'lost') && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full flex flex-col items-center gap-4"
        >
          <div className={`text-4xl font-black ${phase === 'cashed' ? 'text-green-400 glow-green' : 'text-red-400 glow-red'}`}>
            {phase === 'cashed' ? `🎉 +${formatCurrency(currentPot)}` : '💀 BUST!'}
          </div>
          {phase === 'lost' && (
            <div className="text-white/50 text-sm">You got {streak} in a row</div>
          )}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={reset}
            className="w-full py-4 rounded-2xl text-xl font-black text-white"
            style={{
              background: phase === 'cashed'
                ? 'linear-gradient(135deg,#22c55e,#16a34a)'
                : 'linear-gradient(135deg,#ef4444,#dc2626)',
              boxShadow: phase === 'cashed'
                ? '0 4px 24px rgba(34,197,94,0.4)'
                : '0 4px 24px rgba(239,68,68,0.4)',
            }}
          >
            {phase === 'cashed' ? '🃏 Play Again' : '😤 Try Again'}
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
