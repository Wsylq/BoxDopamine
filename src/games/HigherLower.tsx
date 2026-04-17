// ============================================================
// DOPAMINE BOX - Higher or Lower Card Game
// Guess if the next card is higher or lower — chain wins for multipliers!
// ============================================================

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptic, sound, formatCurrency } from '../store/gameStore';

interface HigherLowerProps {
  balance: number;
  onResult: (delta: number, won: boolean) => void;
  onClose: () => void;
}

type Suit = '♠️' | '♥️' | '♦️' | '♣️';
type GameState = 'betting' | 'playing' | 'result';

interface Card {
  value: number;
  label: string;
  suit: Suit;
}

const SUITS: Suit[] = ['♠️', '♥️', '♦️', '♣️'];
const LABELS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const BET_OPTIONS = [10, 50, 100, 500, 1000, 5000];

const drawCard = (): Card => {
  const value = Math.floor(Math.random() * 13) + 1;
  return {
    value,
    label: LABELS[value - 1],
    suit: SUITS[Math.floor(Math.random() * 4)],
  };
};

const isRed = (suit: Suit) => suit === '♥️' || suit === '♦️';

const CardDisplay: React.FC<{ card: Card; flipped?: boolean }> = ({ card, flipped }) => {
  const red = isRed(card.suit);
  return (
    <motion.div
      initial={flipped ? { rotateY: 90 } : {}}
      animate={{ rotateY: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        width: 100,
        height: 140,
        borderRadius: 14,
        background: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 8px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        color: red ? '#E63946' : '#1a1a2e',
        fontFamily: 'Inter, sans-serif',
        fontWeight: 900,
        fontSize: 20,
        userSelect: 'none',
      }}
    >
      <div style={{ alignSelf: 'flex-start', fontSize: 18 }}>{card.label}</div>
      <div style={{ fontSize: 36 }}>{card.suit}</div>
      <div style={{ alignSelf: 'flex-end', fontSize: 18, transform: 'rotate(180deg)' }}>{card.label}</div>
    </motion.div>
  );
};

const HiddenCard: React.FC = () => (
  <div style={{
    width: 100,
    height: 140,
    borderRadius: 14,
    background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 40,
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    border: '2px solid rgba(255,255,255,0.1)',
  }}>
    🎴
  </div>
);

const HigherLower: React.FC<HigherLowerProps> = ({ balance, onResult, onClose }) => {
  const [bet, setBet] = useState(100);
  const [gameState, setGameState] = useState<GameState>('betting');
  const [currentCard, setCurrentCard] = useState<Card>(drawCard());
  const [nextCard, setNextCard] = useState<Card | null>(null);
  const [multiplier, setMultiplier] = useState(1);
  const [streak, setStreak] = useState(0);
  const [won, setWon] = useState<boolean | null>(null);
  const [guessResult, setGuessResult] = useState<'correct' | 'wrong' | null>(null);

  const startGame = () => {
    setCurrentCard(drawCard());
    setNextCard(null);
    setMultiplier(1);
    setStreak(0);
    setGameState('playing');
    setWon(null);
    setGuessResult(null);
    haptic.medium();
    sound.playCardFlip();
  };

  const guess = useCallback((higher: boolean) => {
    const next = drawCard();
    const correct = higher ? next.value > currentCard.value : next.value < currentCard.value;
    // Treat equal as wrong for house edge
    const actualCorrect = next.value !== currentCard.value && correct;

    setNextCard(next);
    sound.playCardFlip();
    haptic.medium();

    setTimeout(() => {
      if (actualCorrect) {
        const newMultiplier = multiplier * 2;
        const newStreak = streak + 1;
        setMultiplier(newMultiplier);
        setStreak(newStreak);
        setGuessResult('correct');
        haptic.win();
        sound.playHigherLower(true);

        setTimeout(() => {
          setCurrentCard(next);
          setNextCard(null);
          setGuessResult(null);
        }, 1000);
      } else {
        setGuessResult('wrong');
        haptic.lose();
        sound.playHigherLower(false);

        setTimeout(() => {
          setWon(false);
          setGameState('result');
          onResult(-bet, false);
        }, 1200);
      }
    }, 400);
  }, [currentCard, multiplier, streak, bet, onResult]);

  const cashOut = () => {
    if (streak === 0) return;
    haptic.success();
    sound.playWin();
    const winAmount = bet * multiplier - bet;
    onResult(winAmount, true);
    setWon(true);
    setGameState('result');
  };

  const reset = () => {
    setGameState('betting');
    setCurrentCard(drawCard());
    setNextCard(null);
    setMultiplier(1);
    setStreak(0);
    setWon(null);
    setGuessResult(null);
    haptic.light();
  };

  const safeBet = Math.min(bet, balance);

  return (
    <div className="flex flex-col items-center h-full overflow-y-auto pb-8">
      {/* Header */}
      <div className="w-full flex items-center justify-between px-4 pt-4 pb-2">
        <button onClick={onClose} className="text-2xl" style={{ background: 'none', border: 'none', color: '#fff' }}>✕</button>
        <h2 className="text-xl font-bold text-white">🃏 Higher or Lower</h2>
        <div className="text-green-400 font-bold text-sm">{formatCurrency(balance)}</div>
      </div>

      {/* Multiplier + Streak */}
      {gameState === 'playing' && (
        <div className="flex gap-4 mb-4 mt-2">
          <div className="px-4 py-2 rounded-xl text-center" style={{ background: 'rgba(255,215,0,0.15)', border: '1px solid rgba(255,215,0,0.3)' }}>
            <div className="text-yellow-400 font-black text-xl">{multiplier}x</div>
            <div className="text-gray-400 text-xs">MULTIPLIER</div>
          </div>
          <div className="px-4 py-2 rounded-xl text-center" style={{ background: 'rgba(0,255,148,0.1)', border: '1px solid rgba(0,255,148,0.2)' }}>
            <div className="text-green-400 font-black text-xl">{streak} 🔥</div>
            <div className="text-gray-400 text-xs">STREAK</div>
          </div>
          <div className="px-4 py-2 rounded-xl text-center" style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.2)' }}>
            <div className="text-red-400 font-black text-xl">{formatCurrency(safeBet * multiplier)}</div>
            <div className="text-gray-400 text-xs">POTENTIAL</div>
          </div>
        </div>
      )}

      {/* Card area */}
      {gameState !== 'betting' && (
        <div className="flex items-center gap-6 my-4">
          <CardDisplay card={currentCard} />
          
          {/* VS divider */}
          <div className="flex flex-col items-center gap-2">
            <div className="text-2xl font-black text-yellow-400">VS</div>
            <div className="text-xs text-gray-500 text-center">Next<br/>card?</div>
          </div>

          {nextCard ? <CardDisplay card={nextCard} flipped /> : <HiddenCard />}
        </div>
      )}

      {/* Guess result feedback */}
      <AnimatePresence>
        {guessResult && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-3xl font-black mb-2"
            style={{ color: guessResult === 'correct' ? '#00FF94' : '#FF4757' }}
          >
            {guessResult === 'correct' ? `✅ CORRECT! x${multiplier}` : '❌ WRONG!'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game result */}
      {gameState === 'result' && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center my-4"
        >
          <div className="text-4xl font-black mb-2" style={{ color: won ? '#00FF94' : '#FF4757' }}>
            {won ? '💰 CASHED OUT!' : '💀 BUST!'}
          </div>
          {won && (
            <div className="text-green-400 font-bold text-lg">+{formatCurrency(safeBet * multiplier - safeBet)}</div>
          )}
          {!won && (
            <div className="text-red-400 font-bold text-lg">-{formatCurrency(safeBet)}</div>
          )}
        </motion.div>
      )}

      {/* Betting UI */}
      {gameState === 'betting' && (
        <div className="w-full px-6 mt-4">
          <p className="text-center text-gray-400 text-sm mb-3 font-semibold">CHOOSE YOUR BET</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {BET_OPTIONS.map((amount) => (
              <motion.button
                key={amount}
                whileTap={{ scale: 0.93 }}
                onClick={() => { setBet(amount); haptic.light(); sound.playCoin(); }}
                className="py-2 rounded-xl text-sm font-bold"
                style={{
                  background: bet === amount ? 'linear-gradient(135deg, #00FF94, #00B4D8)' : 'rgba(255,255,255,0.08)',
                  border: bet === amount ? '2px solid #00FF94' : '2px solid rgba(255,255,255,0.1)',
                  color: bet === amount ? '#000' : '#fff',
                  opacity: amount > balance ? 0.4 : 1,
                }}
                disabled={amount > balance}
              >
                {formatCurrency(amount)}
              </motion.button>
            ))}
          </div>

          <div className="text-center mb-4 py-3 rounded-xl" style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.2)' }}>
            <span className="text-gray-400 text-sm">Bet: </span>
            <span className="text-yellow-400 font-black text-lg">{formatCurrency(safeBet)}</span>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={startGame}
            className="w-full py-4 rounded-2xl text-lg font-black text-white"
            style={{
              background: 'linear-gradient(135deg, #FF6B6B, #FF8E53)',
              boxShadow: '0 4px 24px rgba(255,107,107,0.4)',
            }}
          >
            🃏 START GAME
          </motion.button>
        </div>
      )}

      {/* Playing UI */}
      {gameState === 'playing' && !guessResult && (
        <div className="w-full px-6 flex flex-col gap-3 mt-4">
          <div className="flex gap-4">
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={() => guess(true)}
              className="flex-1 py-4 rounded-2xl text-xl font-black text-white"
              style={{ background: 'linear-gradient(135deg, #00FF94, #00B4D8)', color: '#000' }}
            >
              ⬆️ HIGHER
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={() => guess(false)}
              className="flex-1 py-4 rounded-2xl text-xl font-black text-white"
              style={{ background: 'linear-gradient(135deg, #FF6B6B, #FF4757)' }}
            >
              ⬇️ LOWER
            </motion.button>
          </div>
          {streak > 0 && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileTap={{ scale: 0.95 }}
              onClick={cashOut}
              className="w-full py-3 rounded-2xl text-base font-black"
              style={{
                background: 'linear-gradient(135deg, #FFD700, #FF8C00)',
                color: '#000',
                boxShadow: '0 4px 20px rgba(255,215,0,0.4)',
              }}
            >
              💰 CASH OUT {formatCurrency(safeBet * multiplier)} ({multiplier}x)
            </motion.button>
          )}
        </div>
      )}

      {/* Play Again */}
      {gameState === 'result' && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileTap={{ scale: 0.95 }}
          onClick={reset}
          className="mt-4 px-10 py-4 rounded-2xl text-lg font-black text-white"
          style={{
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            boxShadow: '0 4px 24px rgba(102,126,234,0.4)',
          }}
        >
          🔄 Play Again
        </motion.button>
      )}
    </div>
  );
};

export default HigherLower;
