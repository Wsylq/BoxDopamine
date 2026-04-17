// ============================================================
// DOPAMINE BOX - Higher or Lower
// Card guessing game with multipliers
// ============================================================
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptic, sound, formatCurrency } from '../store/gameStore';

type Suit = '♠' | '♥' | '♦' | '♣';
interface Card { value: number; suit: Suit; label: string; }
type GameState = 'betting' | 'playing' | 'result';

const BET_OPTIONS = [10, 25, 50, 100, 250, 500, 1000, 2500];
const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
const LABELS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

const drawCard = (): Card => {
  const value = Math.floor(Math.random() * 13) + 2;
  const suit = SUITS[Math.floor(Math.random() * 4)];
  return { value, suit, label: LABELS[value - 2] };
};

const isRed = (suit: Suit) => suit === '♥' || suit === '♦';

interface HigherLowerProps {
  balance: number;
  onResult: (delta: number, won: boolean) => void;
  onClose: () => void;
}

const CardFace: React.FC<{ card: Card; faceDown?: boolean }> = ({ card, faceDown }) => (
  <div
    className="relative rounded-2xl flex items-center justify-center"
    style={{
      width: 140, height: 200,
      background: faceDown
        ? 'linear-gradient(135deg, #1a1a2e, #16213e)'
        : 'linear-gradient(145deg, #f0e8ff, #e8d5ff)',
      border: faceDown ? '2px solid rgba(255,255,255,0.1)' : '2px solid rgba(255,255,255,0.8)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}
  >
    {faceDown ? (
      <div className="text-4xl opacity-30">🂠</div>
    ) : (
      <>
        <div
          className="absolute top-3 left-4 text-left leading-tight"
          style={{ color: isRed(card.suit) ? '#cc0000' : '#1a1a1a', fontWeight: 900, fontSize: 18 }}
        >
          <div>{card.label}</div>
          <div>{card.suit}</div>
        </div>
        <div
          className="text-6xl font-black"
          style={{ color: isRed(card.suit) ? '#cc0000' : '#1a1a1a' }}
        >
          {card.suit}
        </div>
        <div
          className="absolute bottom-3 right-4 text-right leading-tight rotate-180"
          style={{ color: isRed(card.suit) ? '#cc0000' : '#1a1a1a', fontWeight: 900, fontSize: 18 }}
        >
          <div>{card.label}</div>
          <div>{card.suit}</div>
        </div>
      </>
    )}
  </div>
);

const HigherLower: React.FC<HigherLowerProps> = ({ balance, onResult, onClose }) => {
  const [bet, setBet] = useState(25);
  const [gameState, setGameState] = useState<GameState>('betting');
  const [currentCard, setCurrentCard] = useState<Card>(drawCard());
  const [nextCard, setNextCard] = useState<Card | null>(null);
  const [multiplier, setMultiplier] = useState(1.0);
  const [streak, setStreak] = useState(0);
  const [won, setWon] = useState<boolean | null>(null);
  const [guessResult, setGuessResult] = useState<'correct' | 'wrong' | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [isRevealing, setIsRevealing] = useState(false);

  const safeBet = Math.min(bet, balance);

  const startGame = () => {
    setCurrentCard(drawCard());
    setNextCard(null);
    setMultiplier(1.0);
    setStreak(0);
    setGameState('playing');
    setWon(null);
    setGuessResult(null);
    setCorrectCount(0);
    setIsRevealing(false);
    haptic.medium();
    sound.playCardFlip();
  };

  const guess = useCallback((higher: boolean) => {
    if (isRevealing) return;
    setIsRevealing(true);
    const next = drawCard();
    const correct = higher ? next.value > currentCard.value : next.value < currentCard.value;
    const actualCorrect = next.value !== currentCard.value && correct;

    setNextCard(next);
    sound.playCardFlip();
    haptic.medium();

    setTimeout(() => {
      if (actualCorrect) {
        const newStreak = streak + 1;
        const newMultiplier = parseFloat((multiplier + 0.5).toFixed(1));
        const newCorrect = correctCount + 1;
        setMultiplier(newMultiplier);
        setStreak(newStreak);
        setCorrectCount(newCorrect);
        setGuessResult('correct');
        haptic.win();
        sound.playHigherLower(true);
        setTimeout(() => {
          setCurrentCard(next);
          setNextCard(null);
          setGuessResult(null);
          setIsRevealing(false);
        }, 900);
      } else {
        setGuessResult('wrong');
        haptic.lose();
        sound.playHigherLower(false);
        setTimeout(() => {
          setWon(false);
          setGameState('result');
          onResult(-safeBet, false);
        }, 1200);
      }
    }, 500);
  }, [currentCard, multiplier, streak, safeBet, onResult, isRevealing, correctCount]);

  const cashOut = () => {
    if (streak === 0) return;
    haptic.success();
    sound.playWin();
    const winAmount = Math.floor(safeBet * multiplier) - safeBet;
    onResult(winAmount, true);
    setWon(true);
    setGameState('result');
  };

  const reset = () => {
    setGameState('betting');
    setCurrentCard(drawCard());
    setNextCard(null);
    setMultiplier(1.0);
    setStreak(0);
    setWon(null);
    setGuessResult(null);
    setCorrectCount(0);
    setIsRevealing(false);
    haptic.light();
  };

  return (
    <div className="flex flex-col h-full bg-black text-white select-none">
      {/* TOP BAR */}
      <div className="flex items-center justify-between px-5 pt-14 pb-2">
        <span className="text-green-400 font-bold text-lg">${balance.toFixed(0)}</span>
        {gameState === 'playing' && (
          <span className="text-yellow-400 font-bold">${(safeBet * multiplier).toFixed(0)}</span>
        )}
        <button onClick={onClose} className="text-white/50 text-2xl leading-none">×</button>
      </div>

      {/* GAME TITLE */}
      <div className="flex flex-col items-center pt-2 pb-1">
        <div className="text-white/40 text-xs tracking-widest uppercase">Higher or Lower</div>
        <div className="text-white/60 text-xs mt-0.5">BET {safeBet}</div>
      </div>

      {/* CORRECT COUNT */}
      {gameState === 'playing' && (
        <div className="flex justify-center mt-1">
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="w-6 h-1 rounded-full"
                style={{ background: i < correctCount ? '#22c55e' : 'rgba(255,255,255,0.15)' }}
              />
            ))}
          </div>
        </div>
      )}

      {/* MULTIPLIER */}
      <div className="flex justify-center mt-3">
        <motion.div
          key={multiplier}
          initial={{ scale: 1.3 }}
          animate={{ scale: 1 }}
          className="text-5xl font-black"
          style={{
            background: 'linear-gradient(135deg, #22c55e, #86efac)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: 'none',
          }}
        >
          {multiplier.toFixed(1)}x
        </motion.div>
      </div>

      {/* CARD AREA */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        {gameState !== 'betting' && (
          <div className="flex gap-4 items-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentCard.label + currentCard.suit}
                initial={{ rotateY: 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <CardFace card={currentCard} />
              </motion.div>
            </AnimatePresence>

            <AnimatePresence>
              {nextCard ? (
                <motion.div
                  key="next"
                  initial={{ rotateY: 90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <CardFace card={nextCard} />
                </motion.div>
              ) : (
                <motion.div key="facedown" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <CardFace card={{ value: 0, suit: '♠', label: '?' }} faceDown />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* RESULT FEEDBACK */}
        <AnimatePresence>
          {guessResult && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="text-center"
            >
              {guessResult === 'correct' ? (
                <div className="text-green-400 font-black text-3xl" style={{ textShadow: '0 0 20px rgba(34,197,94,0.6)' }}>
                  ✓ CORRECT! ×{multiplier.toFixed(1)}
                </div>
              ) : (
                <div className="text-red-500 font-black text-3xl" style={{ textShadow: '0 0 20px rgba(239,68,68,0.6)' }}>
                  WRONG!
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* GAME RESULT SCREEN */}
        {gameState === 'result' && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-2"
            >
              <div
                className={`font-black text-4xl ${won ? 'text-green-400' : 'text-red-500'}`}
                style={{ textShadow: won ? '0 0 25px rgba(34,197,94,0.7)' : '0 0 25px rgba(239,68,68,0.7)' }}
              >
                {won ? 'CASHED OUT!' : 'WRONG!'}
              </div>
              {won ? (
                <div className="text-yellow-400 font-bold text-xl">
                  +{formatCurrency(safeBet * multiplier - safeBet)}
                </div>
              ) : (
                <div className="text-red-400 text-base font-semibold">
                  YOU LOST {safeBet} COINS
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* BOTTOM SECTION */}
      <div className="px-6 pb-10 pt-2 flex flex-col gap-3">
        {/* BETTING UI */}
        {gameState === 'betting' && (
          <>
            <div className="text-white/40 text-xs tracking-widest uppercase text-center mb-1">Choose Bet</div>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {BET_OPTIONS.filter(b => b <= balance + 1).map(amount => (
                <button
                  key={amount}
                  onClick={() => { setBet(amount); haptic.light(); }}
                  className="py-3 rounded-xl font-bold text-sm"
                  style={{
                    background: bet === amount ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'rgba(255,255,255,0.08)',
                    color: bet === amount ? '#fff' : 'rgba(255,255,255,0.6)',
                    border: bet === amount ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  ${amount >= 1000 ? `${amount / 1000}K` : amount}
                </button>
              ))}
            </div>
            <button
              onClick={startGame}
              className="w-full py-4 rounded-2xl font-black text-base text-black"
              style={{ background: 'linear-gradient(135deg, #FFD700, #FF8C00)', boxShadow: '0 4px 24px rgba(255,165,0,0.4)' }}
            >
              START GAME
            </button>
          </>
        )}

        {/* PLAYING UI */}
        {gameState === 'playing' && !guessResult && !isRevealing && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <button
                onClick={() => guess(true)}
                className="flex-1 py-4 rounded-2xl font-black text-base"
                style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 4px 16px rgba(34,197,94,0.4)' }}
              >
                ↑ HIGHER
              </button>
              <button
                onClick={() => guess(false)}
                className="flex-1 py-4 rounded-2xl font-black text-base"
                style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)', boxShadow: '0 4px 16px rgba(239,68,68,0.4)' }}
              >
                ↓ LOWER
              </button>
            </div>
            {streak > 0 && (
              <button
                onClick={cashOut}
                className="w-full py-3 rounded-2xl font-bold text-sm"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                💰 CASH OUT {formatCurrency(safeBet * multiplier)}
              </button>
            )}
          </div>
        )}

        {/* PLAY AGAIN */}
        {gameState === 'result' && (
          <button
            onClick={reset}
            className="w-full py-4 rounded-2xl font-black text-base"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}
          >
            PLAY AGAIN
          </button>
        )}
      </div>

      {/* BOTTOM STATS */}
      <div
        className="flex justify-around items-center px-6 py-3 mx-4 mb-4 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="text-center">
          <div className="text-white font-bold text-lg">{streak}</div>
          <div className="text-white/40 text-xs">STREAK</div>
        </div>
        <div className="text-center">
          <div className="text-white font-bold text-lg">${safeBet}</div>
          <div className="text-white/40 text-xs">BET</div>
        </div>
        <div className="text-center">
          <div className="text-white font-bold text-lg">{multiplier.toFixed(1)}x</div>
          <div className="text-white/40 text-xs">MULTI</div>
        </div>
      </div>
    </div>
  );
};

export default HigherLower;
