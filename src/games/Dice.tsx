import { useState, useCallback } from 'react';
import { addBalance, formatCurrency, getState, sounds, haptics } from '../store/gameStore';

const BETS = [10, 25, 50, 100, 250, 500];

export default function Dice() {
  const [bet, setBet] = useState(50);
  const [winChance, setWinChance] = useState(50);
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState<{ roll: number; won: boolean; payout: number } | null>(null);
  const [showLossEffect, setShowLossEffect] = useState(false);

  const { balance } = getState();
  const safeBet = Math.min(bet, balance);

  // Calculate multiplier based on win chance
  const multiplier = (98 / winChance).toFixed(2);
  const potentialWin = Math.floor(safeBet * parseFloat(multiplier));

  const roll = useCallback(() => {
    if (rolling || balance < safeBet) return;
    
    setRolling(true);
    setResult(null);
    haptics.medium();
    sounds.click();

    // Animate rolling
    let count = 0;
    const interval = setInterval(() => {
      count++;
      sounds.flip();
      if (count >= 10) {
        clearInterval(interval);
        
        // Determine result
        const diceRoll = Math.floor(Math.random() * 100) + 1;
        const won = diceRoll <= winChance;
        const payout = won ? potentialWin : 0;
        const delta = payout - safeBet;
        
        setResult({ roll: diceRoll, won, payout });
        setRolling(false);
        
        addBalance(delta);
        
        if (won) {
          if (winChance <= 10) {
            haptics.win();
            sounds.bigWin();
          } else {
            haptics.win();
            sounds.win();
          }
        } else {
          haptics.lose();
          sounds.lose();
          setShowLossEffect(true);
          setTimeout(() => setShowLossEffect(false), 600);
        }
      }
    }, 80);
  }, [rolling, balance, safeBet, winChance, potentialWin]);

  const getChanceColor = (chance: number) => {
    if (chance >= 75) return '#22c55e';
    if (chance >= 50) return '#FFD700';
    if (chance >= 25) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-4 h-full" style={{ paddingBottom: 120 }}>
      {/* Red vignette on loss */}
      {showLossEffect && <div className="red-vignette" />}
      
      {/* Dice Display */}
      <div className="relative flex items-center justify-center" style={{ height: 180 }}>
        <div
          className="w-32 h-32 rounded-3xl flex items-center justify-center transition-all"
          style={{
            background: rolling 
              ? 'linear-gradient(135deg, #60a5fa, #3b82f6)'
              : result?.won
              ? 'linear-gradient(135deg, #22c55e, #16a34a)'
              : result
              ? 'linear-gradient(135deg, #ef4444, #dc2626)'
              : 'linear-gradient(135deg, #6366f1, #4f46e5)',
            boxShadow: rolling 
              ? '0 0 40px rgba(96,165,250,0.6)'
              : result?.won
              ? '0 0 40px rgba(34,197,94,0.6)'
              : result
              ? '0 0 40px rgba(239,68,68,0.6)'
              : '0 8px 32px rgba(99,102,241,0.4)',
            transform: rolling ? 'scale(1.1) rotate(360deg)' : 'scale(1)',
            transition: rolling ? 'transform 0.8s linear' : 'all 0.3s ease',
          }}
        >
          <div className="text-white font-black text-5xl">
            {rolling ? '?' : result ? result.roll : '🎲'}
          </div>
        </div>

        {/* Result indicator */}
        {result && !rolling && (
          <div
            className="absolute fade-in"
            style={{ top: -20 }}
          >
            <div className={`text-2xl font-black ${result.won ? 'text-green-400' : 'text-red-400'}`}>
              {result.won ? `+${formatCurrency(result.payout - safeBet)}` : formatCurrency(-safeBet)}
            </div>
          </div>
        )}
      </div>

      {/* Target Range Visualization */}
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/40 text-xs">Roll under {winChance} to win</span>
          <span className="text-white/40 text-xs">{multiplier}x</span>
        </div>
        <div className="relative h-8 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          {/* Win zone */}
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all"
            style={{
              width: `${winChance}%`,
              background: `linear-gradient(90deg, ${getChanceColor(winChance)}, ${getChanceColor(winChance)}aa)`,
            }}
          />
          {/* Result marker */}
          {result && (
            <div
              className="absolute top-0 h-full w-1 bg-white fade-in"
              style={{
                left: `${result.roll}%`,
                boxShadow: '0 0 8px rgba(255,255,255,0.8)',
              }}
            />
          )}
          {/* Center text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white font-bold text-sm">
              {result ? `Rolled ${result.roll}` : `Win: 1-${winChance}`}
            </span>
          </div>
        </div>
      </div>

      {/* Result */}
      {result && !rolling && (
        <div className={`text-center ${!result.won ? 'shake-intense' : ''}`}>
          <div className={`text-2xl font-black ${result.won ? 'text-green-400' : 'text-red-400'}`}>
            {result.won ? '🎉 YOU WIN!' : '💀 YOU LOSE'}
          </div>
          <div className="text-white/40 text-xs">
            {result.won ? `${multiplier}x multiplier` : `Rolled ${result.roll} > ${winChance}`}
          </div>
        </div>
      )}

      {rolling && (
        <div className="text-white/60 text-lg font-semibold">
          Rolling...
        </div>
      )}

      {!rolling && !result && (
        <div className="text-white/40 text-sm">
          Set your win chance and roll!
        </div>
      )}

      {/* Win Chance Slider */}
      <div className="w-full">
        <div className="text-white/40 text-xs mb-2 text-center">WIN CHANCE: {winChance}%</div>
        <input
          type="range"
          min="1"
          max="98"
          value={winChance}
          onChange={(e) => {
            setWinChance(parseInt(e.target.value));
            haptics.light();
          }}
          disabled={rolling}
          className="w-full h-2 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${getChanceColor(winChance)} 0%, ${getChanceColor(winChance)} ${winChance}%, rgba(255,255,255,0.1) ${winChance}%, rgba(255,255,255,0.1) 100%)`,
          }}
        />
        <div className="flex justify-between text-white/30 text-xs mt-1">
          <span>1% (98x)</span>
          <span>98% (1x)</span>
        </div>
      </div>

      {/* Bet selector */}
      <div className="w-full">
        <div className="text-white/40 text-xs mb-2 text-center">BET AMOUNT</div>
        <div className="flex flex-wrap gap-2 justify-center">
          {BETS.map(b => (
            <button
              key={b}
              onClick={() => { setBet(b); haptics.light(); sounds.click(); }}
              disabled={rolling}
              className="px-3 py-1.5 rounded-xl text-sm font-bold transition-all"
              style={{
                background: bet === b ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)',
                border: bet === b ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.1)',
                color: bet === b ? '#6366f1' : 'rgba(255,255,255,0.5)',
                opacity: rolling ? 0.5 : 1,
              }}
            >
              {formatCurrency(b)}
            </button>
          ))}
        </div>
      </div>

      {/* Potential Win Display */}
      <div className="w-full px-4 py-3 rounded-2xl" style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
        <div className="flex items-center justify-between">
          <span className="text-white/60 text-sm">Potential Win:</span>
          <span className="text-indigo-400 font-black text-lg">{formatCurrency(potentialWin)}</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-white/40 text-xs">Multiplier:</span>
          <span className="text-white/60 text-xs">{multiplier}x</span>
        </div>
      </div>

      {/* Action button */}
      {result ? (
        <button
          onClick={() => setResult(null)}
          className="w-full py-4 rounded-2xl font-black text-lg"
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff',
          }}
        >
          Roll Again
        </button>
      ) : (
        <button
          onClick={roll}
          disabled={rolling || balance <= 0}
          className="w-full py-4 rounded-2xl font-black text-lg transition-all"
          style={{
            background: rolling || balance <= 0
              ? 'rgba(255,255,255,0.05)'
              : 'linear-gradient(135deg, #6366f1, #4f46e5)',
            color: rolling || balance <= 0 ? 'rgba(255,255,255,0.3)' : '#fff',
            boxShadow: !rolling && balance > 0 ? '0 4px 20px rgba(99,102,241,0.4)' : 'none',
          }}
        >
          {rolling ? 'Rolling...' : `Roll Dice — ${formatCurrency(safeBet)}`}
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
