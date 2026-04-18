import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getState, subscribe, formatCurrency, resetBalance, sounds, haptics } from '../store/gameStore';

const GOAL = 10_000_000;

function StatRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between py-3"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span className="text-white/50 text-sm">{label}</span>
      <span className="font-bold text-base" style={{ color: accent ?? '#fff' }}>{value}</span>
    </div>
  );
}

export default function StatsScreen() {
  const [state, setState] = useState(getState());

  useEffect(() => {
    const unsub = subscribe(() => setState(getState()));
    return () => { unsub(); };
  }, []);

  const { balance, streak, totalWins, totalLosses, biggestWin } = state;
  const goalPct = Math.min(100, (balance / GOAL) * 100);
  const winRate = totalWins + totalLosses > 0
    ? ((totalWins / (totalWins + totalLosses)) * 100).toFixed(1)
    : '—';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="h-full overflow-y-auto px-5 py-6"
      style={{ paddingTop: 80 }}
    >
      {/* Goal progress */}
      <div
        className="rounded-3xl p-5 mb-5"
        style={{
          background: 'linear-gradient(135deg, rgba(255,215,0,0.12) 0%, rgba(255,140,0,0.08) 100%)',
          border: '1px solid rgba(255,215,0,0.2)',
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🏆</span>
          <div>
            <div className="text-white font-black">$10 Million Goal</div>
            <div className="text-white/40 text-sm">{goalPct.toFixed(3)}% there</div>
          </div>
        </div>
        <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #FFD700, #FFA500)' }}
            initial={{ width: 0 }}
            animate={{ width: `${goalPct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-white/40">
          <span>{formatCurrency(balance)}</span>
          <span>$10M</span>
        </div>
      </div>

      {/* Stats card */}
      <div
        className="rounded-3xl p-5 mb-5"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="text-white/40 text-xs font-bold mb-1 tracking-widest uppercase">Your Stats</div>
        <StatRow label="Balance" value={formatCurrency(balance)} accent="#FFD700" />
        <StatRow label="Daily Streak" value={`🔥 ${streak} day${streak !== 1 ? 's' : ''}`} accent="#FF6B6B" />
        <StatRow label="Total Wins" value={String(totalWins)} accent="#22c55e" />
        <StatRow label="Total Losses" value={String(totalLosses)} accent="#ef4444" />
        <StatRow label="Win Rate" value={`${winRate}%`} />
        <StatRow label="Biggest Win" value={formatCurrency(biggestWin)} accent="#a78bfa" />
      </div>

      {/* Psychological hooks info */}
      <div
        className="rounded-3xl p-5 mb-5"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="text-white/40 text-xs font-bold mb-3 tracking-widest uppercase">⚠️ Educational Note</div>
        <div className="text-white/50 text-xs leading-relaxed">
          This app is a <span className="text-white/80">satirical/educational</span> project demonstrating
          psychological techniques used in social media and gambling apps:
          variable ratio reinforcement, loss aversion, sunk cost bias, and fast feedback loops.
        </div>
      </div>

      {/* Reset button */}
      <button
        onClick={() => {
          if (confirm('Reset balance to $1,000?')) {
            resetBalance();
            sounds.click();
            haptics.heavy();
          }
        }}
        className="w-full py-3 rounded-2xl font-bold text-sm"
        style={{
          background: 'rgba(239,68,68,0.12)',
          border: '1px solid rgba(239,68,68,0.25)',
          color: '#ef4444',
        }}
      >
        🔄 Reset Balance
      </button>
    </motion.div>
  );
}
