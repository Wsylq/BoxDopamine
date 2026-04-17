// ============================================================
// HIGHER OR LOWER - Card Game
// Dark theme matching the screenshot UI exactly
// ============================================================
import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptic, sound, formatCurrency } from '../store/gameStore';

const SUITS = ['♠', '♥', '♦', '♣'] as const;
type Suit = typeof SUITS[number];

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
type Rank = typeof RANKS[number];

interface Card {
  rank: Rank;
  suit: Suit;
  value: number; // 1-13
}

const BET_OPTIONS = [25, 50, 100, 250, 500, 1000];

function drawCard(): Card {
  const rankIdx = Math.floor(Math.random() * 13);
  const suit = SUITS[Math.floor(Math.random() * 4)];
  return { rank: RANKS[rankIdx], suit, value: rankIdx + 1 };
}

function isRedSuit(suit: Suit): boolean {
  return suit === '♥' || suit === '♦';
}

// Playing card component matching the screenshot
const PlayingCard: React.FC<{ card: Card; small?: boolean; faceDown?: boolean }> = ({ card, small = false, faceDown = false }) => {
  const isRed = isRedSuit(card.suit);
  const color = isRed ? '#e63946' : '#1a1a2e';

  if (faceDown) {
    return (
      <div
        style={{
          width: small ? 60 : 160,
          height: small ? 84 : 224,
          borderRadius: small ? 8 : 16,
          background: 'linear-gradient(135deg, #1a1a3e, #2d2d6e)',
          border: '2px solid rgba(255,255,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: small ? 24 : 48,
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        }}
      >
        🂠
      </div>
    );
  }

  return (
    <div
      style={{
        width: small ? 60 : 160,
        height: small ? 84 : 224,
        borderRadius: small ? 8 : 16,
        background: '#ffffff',
        border: `2px solid rgba(0,0,0,0.1)`,
        display: 'flex',
        flexDirection: 'column',
        padding: small ? '4px 6px' : '10px 14px',
        position: 'relative',
        boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.5)',
        userSelect: 'none',
      }}
    >
      {/* Top-left rank + suit */}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, color }}>
        <span style={{ fontSize: small ? 12 : 22, fontWeight: 900, fontFamily: 'Georgia, serif' }}>{card.rank}</span>
        <span style={{ fontSize: small ? 10 : 18 }}>{card.suit}</span>
      </div>

      {/* Center big suit */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: small ? 28 : 80,
        color,
        lineHeight: 1,
      }}>
        {card.suit}
      </div>

      {/* Bottom-right rank + suit (rotated) */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        lineHeight: 1,
        color,
        alignSelf: 'flex-end',
        transform: 'rotate(180deg)',
      }}>
        <span style={{ fontSize: small ? 12 : 22, fontWeight: 900, fontFamily: 'Georgia, serif' }}>{card.rank}</span>
        <span style={{ fontSize: small ? 10 : 18 }}>{card.suit}</span>
      </div>
    </div>
  );
};

interface HigherLowerProps {
  balance: number;
  onResult: (delta: number, won: boolean) => void;
  onClose: () => void;
}

type GameState = 'betting' | 'playing' | 'result';

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
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#0a0a0a',
      color: '#fff',
      fontFamily: 'Inter, -apple-system, sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* TOP BAR — balance left, close right */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 18px 0',
        zIndex: 10,
      }}>
        <div style={{
          fontSize: 16,
          fontWeight: 700,
          color: '#4ade80',
          letterSpacing: 0.5,
        }}>
          ${balance.toFixed(0)}
        </div>

        {gameState === 'playing' && (
          <div style={{ fontSize: 13, color: '#aaa', fontWeight: 600 }}>
            ${(safeBet * multiplier).toFixed(0)}
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '50%',
            width: 32,
            height: 32,
            color: '#fff',
            fontSize: 16,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ✕
        </button>
      </div>

      {/* GAME TITLE */}
      <div style={{
        textAlign: 'center',
        padding: '10px 0 2px',
      }}>
        <div style={{
          fontSize: 12,
          fontWeight: 700,
          color: '#888',
          letterSpacing: 3,
          textTransform: 'uppercase',
        }}>
          Higher or Lower
        </div>
        <div style={{
          fontSize: 11,
          color: '#666',
          marginTop: 2,
        }}>
          BET {safeBet}
        </div>
      </div>

      {/* CORRECT COUNT */}
      {gameState === 'playing' && (
        <div style={{ textAlign: 'center', padding: '4px 0' }}>
          <div style={{
            fontSize: 12,
            color: '#4ade80',
            fontWeight: 700,
          }}>
            {correctCount}/5 CORRECT
          </div>
        </div>
      )}

      {/* MULTIPLIER */}
      <div style={{
        textAlign: 'center',
        padding: '6px 0 10px',
      }}>
        <div style={{
          fontSize: gameState === 'betting' ? 28 : 42,
          fontWeight: 900,
          color: '#fff',
          letterSpacing: -1,
        }}>
          {multiplier.toFixed(1)}x
        </div>
      </div>

      {/* CARD AREA */}
      {gameState !== 'betting' && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 12,
          padding: '0 20px',
          position: 'relative',
        }}>
          {/* Current Card */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          >
            <PlayingCard card={currentCard} />
          </motion.div>

          {/* Next Card */}
          <AnimatePresence mode="wait">
            {nextCard ? (
              <motion.div
                key="revealed"
                initial={{ rotateY: 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <PlayingCard card={nextCard} small />
              </motion.div>
            ) : (
              <motion.div
                key="facedown"
                style={{ opacity: 0.4 }}
              >
                <PlayingCard card={currentCard} small faceDown />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* RESULT FEEDBACK OVERLAY */}
      <AnimatePresence>
        {guessResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            style={{
              position: 'absolute',
              top: '40%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: guessResult === 'correct'
                ? 'rgba(74, 222, 128, 0.95)'
                : 'rgba(239, 68, 68, 0.95)',
              borderRadius: 16,
              padding: '12px 28px',
              fontSize: 20,
              fontWeight: 900,
              color: '#fff',
              zIndex: 20,
              textAlign: 'center',
              boxShadow: guessResult === 'correct'
                ? '0 0 40px rgba(74,222,128,0.5)'
                : '0 0 40px rgba(239,68,68,0.5)',
            }}
          >
            {guessResult === 'correct' ? `✓ CORRECT! ×${multiplier.toFixed(1)}` : '✗ WRONG!'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* GAME RESULT */}
      {gameState === 'result' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            textAlign: 'center',
            padding: '16px 20px',
          }}
        >
          <div style={{
            fontSize: 28,
            fontWeight: 900,
            color: won ? '#4ade80' : '#ef4444',
          }}>
            {won ? '💰 CASHED OUT!' : '💀 BUST!'}
          </div>
          {won ? (
            <div style={{ fontSize: 20, color: '#4ade80', fontWeight: 700 }}>
              +{formatCurrency(safeBet * multiplier - safeBet)}
            </div>
          ) : (
            <div style={{ fontSize: 20, color: '#ef4444', fontWeight: 700 }}>
              -{formatCurrency(safeBet)}
            </div>
          )}
        </motion.div>
      )}

      {/* SPACER */}
      <div style={{ flex: 1 }} />

      {/* BOTTOM SECTION */}
      <div style={{ padding: '0 20px 32px' }}>

        {/* BETTING UI */}
        {gameState === 'betting' && (
          <div>
            <div style={{
              fontSize: 11,
              color: '#666',
              textAlign: 'center',
              letterSpacing: 2,
              marginBottom: 10,
              textTransform: 'uppercase',
            }}>
              Choose Bet
            </div>

            {/* Bet grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
              marginBottom: 14,
            }}>
              {BET_OPTIONS.map((amount) => (
                <button
                  key={amount}
                  onClick={() => { setBet(amount); haptic.light(); sound.playCoin(); }}
                  disabled={amount > balance}
                  style={{
                    padding: '10px 4px',
                    borderRadius: 10,
                    background: bet === amount
                      ? 'rgba(74,222,128,0.25)'
                      : 'rgba(255,255,255,0.07)',
                    border: bet === amount ? '2px solid #4ade80' : '2px solid rgba(255,255,255,0.1)',
                    color: bet === amount ? '#4ade80' : '#aaa',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    opacity: amount > balance ? 0.3 : 1,
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  ${amount}
                </button>
              ))}
            </div>

            <button
              onClick={startGame}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: 14,
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                border: 'none',
                color: '#fff',
                fontSize: 18,
                fontWeight: 900,
                cursor: 'pointer',
                letterSpacing: 1,
                boxShadow: '0 4px 24px rgba(34,197,94,0.4)',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              🃏 START GAME
            </button>
          </div>
        )}

        {/* PLAYING UI */}
        {gameState === 'playing' && !guessResult && !isRevealing && (
          <div>
            {/* Higher / Lower buttons — exact screenshot style */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 12 }}>
              <button
                onClick={() => guess(true)}
                style={{
                  flex: 1,
                  padding: '18px 0',
                  borderRadius: 14,
                  background: 'linear-gradient(180deg, #22c55e, #15803d)',
                  border: '3px solid #16a34a',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 900,
                  cursor: 'pointer',
                  letterSpacing: 2,
                  boxShadow: '0 6px 20px rgba(34,197,94,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                <span style={{ fontSize: 18 }}>▲</span>
                HIGHER
              </button>

              <button
                onClick={() => guess(false)}
                style={{
                  flex: 1,
                  padding: '18px 0',
                  borderRadius: 14,
                  background: 'linear-gradient(180deg, #dc2626, #991b1b)',
                  border: '3px solid #b91c1c',
                  color: '#fff',
                  fontSize: 16,
                  fontWeight: 900,
                  cursor: 'pointer',
                  letterSpacing: 2,
                  boxShadow: '0 6px 20px rgba(220,38,38,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                <span style={{ fontSize: 18 }}>▼</span>
                LOWER
              </button>
            </div>

            {/* Cash Out */}
            {streak > 0 && (
              <button
                onClick={cashOut}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  border: 'none',
                  color: '#000',
                  fontSize: 16,
                  fontWeight: 900,
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  boxShadow: '0 4px 20px rgba(245,158,11,0.4)',
                }}
              >
                💰 CASH OUT {formatCurrency(safeBet * multiplier)} ({multiplier.toFixed(1)}x)
              </button>
            )}
          </div>
        )}

        {/* PLAY AGAIN */}
        {gameState === 'result' && (
          <button
            onClick={reset}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: 14,
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              border: 'none',
              color: '#fff',
              fontSize: 18,
              fontWeight: 900,
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              boxShadow: '0 4px 24px rgba(99,102,241,0.4)',
            }}
          >
            🔄 Play Again
          </button>
        )}
      </div>

      {/* BOTTOM STATS BAR */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        padding: '10px 20px 16px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(0,0,0,0.3)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>{streak}</div>
          <div style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: 1 }}>Streak</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#4ade80' }}>${safeBet}</div>
          <div style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: 1 }}>Bet</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#f59e0b' }}>{multiplier.toFixed(1)}x</div>
          <div style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: 1 }}>Multi</div>
        </div>
      </div>
    </div>
  );
};

export default HigherLower;
