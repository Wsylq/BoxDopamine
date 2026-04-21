// Achievement unlock toast — slides in from top
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { achievementService, Achievement } from '../services/achievementService';
import { sounds, haptics } from '../store/gameStore';

export default function AchievementToast() {
  const [current, setCurrent] = useState<Achievement | null>(null);
  const [queue, setQueue] = useState<Achievement[]>([]);

  useEffect(() => {
    const unsub = achievementService.onUnlock((a) => {
      sounds.bigWin();
      haptics.win();
      setQueue(q => [...q, a]);
    });
    return () => { unsub(); };
  }, []);

  // Show next from queue whenever current is empty
  useEffect(() => {
    if (current !== null) return;
    if (queue.length === 0) return;
    const [next, ...rest] = queue;
    setCurrent(next);
    setQueue(rest);
  }, [current, queue]);

  // Auto-dismiss after 3s
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => setCurrent(null), 3000);
    return () => clearTimeout(t);
  }, [current]);

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.id + current.unlockedAt}
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className="fixed top-4 left-0 right-0 flex justify-center z-[999]"
          style={{ maxWidth: 430, margin: '0 auto' }}
          onClick={() => setCurrent(null)}
        >
          <div className="mx-4 px-4 py-3 rounded-2xl flex items-center gap-3"
            style={{
              background: 'linear-gradient(135deg, rgba(251,191,36,0.25), rgba(245,158,11,0.15))',
              border: '1px solid rgba(251,191,36,0.5)',
              boxShadow: '0 8px 32px rgba(251,191,36,0.2)',
              backdropFilter: 'blur(12px)',
            }}>
            <div className="text-3xl">{current.emoji}</div>
            <div className="flex-1">
              <div className="text-white/60 text-xs font-bold tracking-widest uppercase">Achievement Unlocked</div>
              <div className="text-white font-black text-sm">{current.name}</div>
              <div className="text-white/60 text-xs">{current.desc}</div>
            </div>
            {/* Progress bar */}
            <motion.div
              className="absolute bottom-0 left-0 h-0.5 rounded-full"
              style={{ background: 'rgba(251,191,36,0.6)' }}
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 3, ease: 'linear' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
