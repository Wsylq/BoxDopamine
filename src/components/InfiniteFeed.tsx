// ============================================================
// DOPAMINE BOX - Infinite Scroll Feed
// The core addictive loop: infinite content that accelerates
// as you swipe faster — dopamine hits at every turn
// ============================================================

import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { haptic, sound, formatCurrency } from '../store/gameStore';

interface FeedItem {
  id: number;
  type: 'reward' | 'challenge' | 'milestone' | 'game' | 'streak';
  emoji: string;
  title: string;
  subtitle: string;
  color: string;
  gradient: string;
  action?: string;
}

interface InfiniteFeedProps {
  balance: number;
  streak: number;
  onGameSelect: (game: 'coinflip' | 'higherlower' | 'plinko' | 'flappy') => void;
  onCollectReward: (amount: number) => void;
}

// Generate infinite dopamine feed items
const generateFeedItems = (startId: number, balance: number): FeedItem[] => {
  const templates: Omit<FeedItem, 'id'>[] = [
    {
      type: 'reward',
      emoji: '🎁',
      title: 'FREE REWARD!',
      subtitle: `Claim ${formatCurrency(Math.floor(Math.random() * 500) + 50)} bonus coins!`,
      color: '#FFD700',
      gradient: 'linear-gradient(135deg, #f6d365, #fda085)',
      action: 'collect',
    },
    {
      type: 'game',
      emoji: '🪙',
      title: 'COIN FLIP',
      subtitle: 'Double your money — heads or tails?',
      color: '#FF6B6B',
      gradient: 'linear-gradient(135deg, #FF6B6B, #FF8E53)',
      action: 'coinflip',
    },
    {
      type: 'challenge',
      emoji: '🔥',
      title: 'HOT STREAK!',
      subtitle: 'You\'re on a roll! Keep going!',
      color: '#FF8C00',
      gradient: 'linear-gradient(135deg, #f7971e, #ffd200)',
      action: 'continue',
    },
    {
      type: 'game',
      emoji: '🃏',
      title: 'HIGHER OR LOWER',
      subtitle: 'Chain multipliers — cash out anytime!',
      color: '#00B4D8',
      gradient: 'linear-gradient(135deg, #667eea, #764ba2)',
      action: 'higherlower',
    },
    {
      type: 'milestone',
      emoji: '🏆',
      title: 'MILESTONE!',
      subtitle: `Only ${formatCurrency(10_000_000 - balance)} to go! You\'re so close!`,
      color: '#00FF94',
      gradient: 'linear-gradient(135deg, #11998e, #38ef7d)',
      action: 'continue',
    },
    {
      type: 'game',
      emoji: '🎯',
      title: 'PLINKO DROP',
      subtitle: 'Watch the ball fall — win up to 10x!',
      color: '#FF4757',
      gradient: 'linear-gradient(135deg, #FC5C7D, #6A3093)',
      action: 'plinko',
    },
    {
      type: 'reward',
      emoji: '💎',
      title: 'DAILY BONUS!',
      subtitle: `Collect your ${formatCurrency(Math.floor(Math.random() * 1000) + 200)} daily reward!`,
      color: '#A78BFA',
      gradient: 'linear-gradient(135deg, #a78bfa, #818cf8)',
      action: 'collect',
    },
    {
      type: 'game',
      emoji: '🐦',
      title: 'FLAPPY COINS',
      subtitle: 'Flap through coins — WOOHOO on 5+!',
      color: '#FFD700',
      gradient: 'linear-gradient(135deg, #f7971e, #FFD700)',
      action: 'flappy',
    },
    {
      type: 'streak',
      emoji: '⚡',
      title: 'STREAK BONUS!',
      subtitle: 'Your daily streak is paying off!',
      color: '#FFA502',
      gradient: 'linear-gradient(135deg, #FFA502, #FF6B00)',
      action: 'collect',
    },
    {
      type: 'challenge',
      emoji: '🎰',
      title: 'SPIN THE WHEEL',
      subtitle: 'Play Plinko and triple your bet!',
      color: '#FF6B6B',
      gradient: 'linear-gradient(135deg, #ee0979, #ff6a00)',
      action: 'plinko',
    },
    {
      type: 'reward',
      emoji: '💰',
      title: 'JACKPOT ALERT!',
      subtitle: `${formatCurrency(Math.floor(Math.random() * 5000) + 1000)} up for grabs!`,
      color: '#FFD700',
      gradient: 'linear-gradient(135deg, #f6d365, #fda085)',
      action: 'collect',
    },
    {
      type: 'challenge',
      emoji: '🚀',
      title: 'LEVEL UP!',
      subtitle: 'You\'re getting closer to $10M!',
      color: '#00FF94',
      gradient: 'linear-gradient(135deg, #43e97b, #38f9d7)',
      action: 'continue',
    },
  ];

  return Array.from({ length: 8 }, (_, i) => ({
    id: startId + i,
    ...templates[(startId + i) % templates.length],
  }));
};

const FeedCard: React.FC<{
  item: FeedItem;
  onAction: (item: FeedItem) => void;
  index: number;
}> = ({ item, onAction, index }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 60, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      onClick={() => onAction(item)}
      style={{
        margin: '8px 16px',
        borderRadius: 20,
        background: item.gradient,
        padding: '20px 20px',
        cursor: 'pointer',
        boxShadow: `0 8px 32px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.1)`,
        position: 'relative',
        overflow: 'hidden',
        minHeight: 120,
      }}
      whileTap={{ scale: 0.97 }}
    >
      {/* Shimmer overlay */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        left: '-50%',
        width: '200%',
        height: '200%',
        background: 'linear-gradient(45deg, transparent 40%, rgba(255,255,255,0.08) 50%, transparent 60%)',
        animation: 'shimmer 2s infinite',
        pointerEvents: 'none',
      }} />
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Emoji icon */}
        <div style={{
          width: 60,
          height: 60,
          borderRadius: 16,
          background: 'rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
          flexShrink: 0,
        }}>
          {item.emoji}
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          <div style={{
            fontWeight: 900,
            fontSize: 18,
            color: 'white',
            fontFamily: 'Inter, sans-serif',
            textShadow: '0 1px 4px rgba(0,0,0,0.3)',
            lineHeight: 1.2,
          }}>
            {item.title}
          </div>
          <div style={{
            fontWeight: 500,
            fontSize: 13,
            color: 'rgba(255,255,255,0.85)',
            fontFamily: 'Inter, sans-serif',
            marginTop: 4,
            lineHeight: 1.3,
          }}>
            {item.subtitle}
          </div>
        </div>

        {/* Arrow */}
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          background: 'rgba(255,255,255,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          color: 'white',
          flexShrink: 0,
        }}>
          →
        </div>
      </div>

      {/* Badge for game types */}
      {item.type === 'game' && (
        <div style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: 'rgba(255,255,255,0.3)',
          borderRadius: 8,
          padding: '2px 8px',
          fontSize: 10,
          fontWeight: 700,
          color: 'white',
          fontFamily: 'Inter, sans-serif',
        }}>
          PLAY
        </div>
      )}
      {item.type === 'reward' && (
        <div style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: 'rgba(255,255,255,0.3)',
          borderRadius: 8,
          padding: '2px 8px',
          fontSize: 10,
          fontWeight: 700,
          color: 'white',
          fontFamily: 'Inter, sans-serif',
        }}>
          FREE!
        </div>
      )}
    </motion.div>
  );
};

const InfiniteFeed: React.FC<InfiniteFeedProps> = ({
  balance,
  streak,
  onGameSelect,
  onCollectReward,
}) => {
  const [items, setItems] = useState<FeedItem[]>(() => generateFeedItems(0, balance));
  const [nextId, setNextId] = useState(8);
  const [collectedItems, setCollectedItems] = useState<Set<number>>(new Set());
  const [floatingText] = useState<{ id: number; text: string; x: number; y: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const scrollVelocity = useRef(0);

  // Load more items as user scrolls
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    
    const currentY = el.scrollTop;
    scrollVelocity.current = currentY - lastScrollY.current;
    lastScrollY.current = currentY;

    // Haptic on fast scroll
    if (Math.abs(scrollVelocity.current) > 15) {
      haptic.light();
    }

    // Load more near bottom
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollTop + clientHeight > scrollHeight - 300) {
      setItems(prev => {
        const newItems = generateFeedItems(nextId, balance);
        setNextId(id => id + 8);
        return [...prev, ...newItems];
      });
    }
  }, [nextId, balance]);

  const handleAction = useCallback((item: FeedItem) => {
    haptic.medium();
    sound.playClick();

    if (item.action === 'coinflip') {
      onGameSelect('coinflip');
    } else if (item.action === 'higherlower') {
      onGameSelect('higherlower');
    } else if (item.action === 'plinko') {
      onGameSelect('plinko');
    } else if (item.action === 'flappy') {
      onGameSelect('flappy');
    } else if (item.action === 'collect' && !collectedItems.has(item.id)) {
      const amount = Math.floor(Math.random() * 500) + 50;
      setCollectedItems(prev => new Set([...prev, item.id]));
      onCollectReward(amount);
      haptic.success();
      sound.playWin();
    }
  }, [onGameSelect, onCollectReward, collectedItems]);

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Streak banner */}
      <motion.div
        animate={{ scale: [1, 1.01, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
        style={{
          margin: '12px 16px 4px',
          padding: '12px 16px',
          borderRadius: 16,
          background: 'linear-gradient(135deg, #FF8C00, #FFD700)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          boxShadow: '0 4px 20px rgba(255,140,0,0.3)',
        }}
      >
        <div style={{ fontSize: 28 }}>🔥</div>
        <div>
          <div style={{ fontWeight: 900, color: '#000', fontSize: 16, fontFamily: 'Inter, sans-serif' }}>
            {streak}-Day Streak! Keep it up!
          </div>
          <div style={{ fontWeight: 600, color: 'rgba(0,0,0,0.7)', fontSize: 12, fontFamily: 'Inter, sans-serif' }}>
            ⚠️ Don't break it — play today!
          </div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 24 }}>→</div>
      </motion.div>

      {/* Progress to $10M */}
      <div style={{
        margin: '8px 16px',
        padding: '12px 16px',
        borderRadius: 16,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: '#fff', fontWeight: 700, fontFamily: 'Inter, sans-serif', fontSize: 13 }}>
            💰 Progress to $10M
          </span>
          <span style={{ color: '#FFD700', fontWeight: 900, fontFamily: 'Inter, sans-serif', fontSize: 13 }}>
            {((balance / 10_000_000) * 100).toFixed(4)}%
          </span>
        </div>
        <div style={{
          height: 8,
          borderRadius: 4,
          background: 'rgba(255,255,255,0.1)',
          overflow: 'hidden',
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (balance / 10_000_000) * 100)}%` }}
            transition={{ duration: 0.5 }}
            style={{
              height: '100%',
              borderRadius: 4,
              background: 'linear-gradient(90deg, #00FF94, #00B4D8)',
              boxShadow: '0 0 8px rgba(0,255,148,0.5)',
            }}
          />
        </div>
        <div style={{ color: '#aaa', fontSize: 11, marginTop: 6, fontFamily: 'Inter, sans-serif', textAlign: 'center' }}>
          {formatCurrency(balance)} / $10M — {formatCurrency(10_000_000 - balance)} to go!
        </div>
      </div>

      {/* Quick games row */}
      <div style={{ padding: '4px 16px 0' }}>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, letterSpacing: 1, fontFamily: 'Inter, sans-serif', marginBottom: 8 }}>
          QUICK PLAY
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 4 }}>
          {[
            { emoji: '🪙', label: 'Coin Flip', game: 'coinflip' as const, color: '#FF6B6B' },
            { emoji: '🃏', label: 'Hi/Lo', game: 'higherlower' as const, color: '#667eea' },
            { emoji: '🎯', label: 'Plinko', game: 'plinko' as const, color: '#FC5C7D' },
            { emoji: '🐦', label: 'Flappy', game: 'flappy' as const, color: '#FFD700' },
          ].map(g => (
            <motion.button
              key={g.game}
              whileTap={{ scale: 0.9 }}
              onClick={() => { haptic.medium(); sound.playClick(); onGameSelect(g.game); }}
              style={{
                padding: '10px 4px',
                borderRadius: 14,
                background: `linear-gradient(135deg, ${g.color}33, ${g.color}55)`,
                border: `1px solid ${g.color}66`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              <span style={{ fontSize: 22 }}>{g.emoji}</span>
              <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>{g.label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Feed items */}
      <div style={{ paddingBottom: 80 }}>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, letterSpacing: 1, fontFamily: 'Inter, sans-serif', padding: '12px 16px 4px' }}>
          FOR YOU ⚡
        </p>
        {items.map((item, i) => (
          <div key={item.id} style={{ opacity: collectedItems.has(item.id) && item.type === 'reward' ? 0.5 : 1 }}>
            <FeedCard
              item={item}
              onAction={handleAction}
              index={i % 8}
            />
          </div>
        ))}
        
        {/* Loading indicator */}
        <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
          Loading more... ⬇️
        </div>
      </div>

      {/* Floating reward text */}
      <AnimatePresence>
        {floatingText && (
          <motion.div
            key={floatingText.id}
            initial={{ opacity: 1, y: 0, scale: 1 }}
            animate={{ opacity: 0, y: -100, scale: 1.3 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              left: floatingText.x,
              top: floatingText.y,
              color: '#FFD700',
              fontWeight: 900,
              fontSize: 22,
              pointerEvents: 'none',
              zIndex: 9999,
              textShadow: '0 0 10px rgba(255,215,0,0.8)',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {floatingText.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InfiniteFeed;
