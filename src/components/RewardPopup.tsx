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

  // Floating coin positions
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
            zIndex: 9000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          {/* Floating coins */}
          {coins.map(coin => (
            <motion.div
              key={coin.id}
              initial={{ x: coin.x, y: 100, opacity: 1, scale: 1 }}
              animate={{ y: -200, opacity: 0, scale: 0.5 }}
              transition={{ duration: coin.duration, delay: coin.delay, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                fontSize: coin.size,
                top: '50%',
                left: '50%',
              }}
            >
              🪙
            </motion.div>
          ))}

          {/* Central reward display */}
          <motion.div
            initial={{ scale: 0, rotate: -15, y: 50 }}
            animate={{ scale: 1, rotate: 0, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: -50 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
            style={{
              background: 'linear-gradient(135deg, #FFD700, #FF8C00)',
              borderRadius: 28,
              padding: '32px 40px',
              textAlign: 'center',
              boxShadow: '0 0 60px rgba(255,215,0,0.6), 0 20px 60px rgba(0,0,0,0.5)',
              position: 'relative',
            }}
          >
            <div style={{ fontSize: 48, lineHeight: 1 }}>💰</div>
            <div style={{
              fontSize: 20,
              fontWeight: 900,
              color: '#000',
              fontFamily: 'Inter, sans-serif',
              marginTop: 8,
              textTransform: 'uppercase',
              letterSpacing: 2,
            }}>
              Collected!
            </div>
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              style={{
                fontSize: 36,
                fontWeight: 900,
                color: '#000',
                fontFamily: 'Inter, sans-serif',
                marginTop: 4,
              }}
            >
              +{formatCurrency(amount)}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RewardPopup;
