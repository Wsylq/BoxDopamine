// ============================================================
// DOPAMINE BOX - Reward Popup
// Flashy "you won!" overlay with coin rain effect
// ============================================================
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '../store/gameStore';

interface RewardPopupProps {
  amount: number | null;
  onDone: () => void;
}

const RewardPopup: React.FC<RewardPopupProps> = ({ amount, onDone }) => {
  useEffect(() => {
    if (amount !== null) {
      const t = setTimeout(onDone, 2000);
      return () => clearTimeout(t);
    }
  }, [amount, onDone]);

  const coins = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: -30 + Math.random() * 60,
    duration: 0.6 + Math.random() * 0.8,
    delay: Math.random() * 0.4,
    size: 16 + Math.random() * 16,
  }));

  return (
    <AnimatePresence>
      {amount !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9997,
            pointerEvents: 'none',
          }}
        >
          {/* Floating coins */}
          {coins.map(coin => (
            <motion.div
              key={coin.id}
              initial={{ y: 0, x: coin.x + '%', opacity: 1, scale: 1 }}
              animate={{ y: -200, opacity: 0, scale: 0.5 }}
              transition={{ duration: coin.duration, delay: coin.delay, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                fontSize: coin.size,
                bottom: '40%',
              }}
            >
              🪙
            </motion.div>
          ))}

          {/* Central reward display */}
          <motion.div
            initial={{ scale: 0.5, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.5, y: -20 }}
            style={{
              background: 'linear-gradient(135deg, #FFD700, #FF8C00)',
              borderRadius: 20,
              padding: '20px 32px',
              textAlign: 'center',
              boxShadow: '0 0 60px rgba(255,215,0,0.6)',
            }}
          >
            <div style={{ fontSize: 32 }}>💰 Collected!</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#000', fontFamily: 'Inter, sans-serif' }}>
              +{formatCurrency(amount)}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RewardPopup;
