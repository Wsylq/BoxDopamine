// ============================================================
// DOPAMINE BOX - Infinite Feed
// The addictive scrolling feed with game triggers
// ============================================================
import React, { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { haptic, sound, formatCurrency } from '../store/gameStore';

type GameType = 'coinflip' | 'higherlower' | 'plinko' | 'flappy';

interface FeedItem {
  id: number;
  type: 'game' | 'reward' | 'stat' | 'winner';
  emoji: string;
  title: string;
  subtitle: string;
  action: GameType | 'collect';
  color: string;
  accentColor: string;
}

function generateFeedItems(startId: number, balance: number): FeedItem[] {
  const templates: Omit<FeedItem, 'id'>[] = [
    {
      type: 'game', emoji: '🃏', title: 'Higher or Lower',
      subtitle: `Win up to ${formatCurrency(balance * 8)}!`,
      action: 'higherlower', color: '#1a0030', accentColor: '#a78bfa',
    },
    {
      type: 'reward', emoji: '🎁', title: 'FREE Reward Available!',
      subtitle: `Claim ${formatCurrency(Math.floor(Math.random() * 500) + 50)} now`,
      action: 'collect', color: '#1a1000', accentColor: '#FFD700',
    },
    {
      type: 'game', emoji: '🪙', title: 'Coin Flip',
      subtitle: 'Double or nothing — 50/50 odds!',
      action: 'coinflip', color: '#1a0a00', accentColor: '#FF6B6B',
    },
    {
      type: 'winner', emoji: '🏆', title: '@CryptoKing just won',
      subtitle: `+${formatCurrency(Math.floor(Math.random() * 5000) + 1000)} on Higher/Lower`,
      action: 'higherlower', color: '#0a1a00', accentColor: '#4ade80',
    },
    {
      type: 'game', emoji: '🎯', title: 'Plinko Drop',
      subtitle: 'Drop the ball, win big — or small!',
      action: 'plinko', color: '#001a0a', accentColor: '#00FF94',
    },
    {
      type: 'stat', emoji: '📈', title: `${Math.floor(Math.random() * 200 + 50)} playing now`,
      subtitle: 'Join the action before it ends!',
      action: 'higherlower', color: '#0a001a', accentColor: '#60a5fa',
    },
    {
      type: 'game', emoji: '🐦', title: 'Flappy Coins',
      subtitle: `Earn ${formatCurrency(Math.max(10, Math.floor(balance * 0.01)))} per coin!`,
      action: 'flappy', color: '#0f0c29', accentColor: '#FFD700',
    },
    {
      type: 'reward', emoji: '💰', title: 'Streak Bonus!',
      subtitle: `Keep your streak — claim ${formatCurrency(Math.floor(Math.random() * 200) + 100)}`,
      action: 'collect', color: '#1a0800', accentColor: '#f97316',
    },
  ];

  return templates.map((t, i) => ({ ...t, id: startId + i }));
}

interface InfiniteFeedProps {
  balance: number;
  streak: number;
  onGameSelect: (game: GameType) => void;
  onCollectReward: (amount: number) => void;
}

const InfiniteFeed: React.FC<InfiniteFeedProps> = ({
  balance,
  streak,
  onGameSelect,
  onCollectReward,
}) => {
  const [items, setItems] = useState<FeedItem[]>(() => generateFeedItems(0, balance));
  const [nextId, setNextId] = useState(8);
  const [collectedItems, setCollectedItems] = useState<Set<number>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const scrollVelocity = useRef(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const currentY = el.scrollTop;
    scrollVelocity.current = currentY - lastScrollY.current;
    lastScrollY.current = currentY;

    if (Math.abs(scrollVelocity.current) > 15) {
      haptic.light();
    }

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

    if (item.action === 'collect' && !collectedItems.has(item.id)) {
      const amount = Math.floor(Math.random() * 500) + 50;
      setCollectedItems(prev => new Set([...prev, item.id]));
      onCollectReward(amount);
      haptic.success();
      sound.playWin();
    } else if (item.action !== 'collect') {
      onGameSelect(item.action);
    }
  }, [onGameSelect, onCollectReward, collectedItems]);

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="scroll-view"
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Streak banner */}
      <motion.div
        animate={{ scale: [1, 1.01, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
        style={{
          background: 'linear-gradient(135deg, #FF8C00, #FFD700)',
          borderRadius: 16,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 28 }}>🔥</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: '#000' }}>
            {streak}-Day Streak! Keep it up!
          </div>
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.6)' }}>
            ⚠️ Don't break it — play today!
          </div>
        </div>
        <span style={{ fontSize: 18, color: '#000' }}>→</span>
      </motion.div>

      {/* Progress to $10M */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: '12px 16px',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>💰 Progress to $10M</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#FFD700' }}>
            {((balance / 10_000_000) * 100).toFixed(4)}%
          </span>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (balance / 10_000_000) * 100)}%` }}
            style={{ height: '100%', background: 'linear-gradient(90deg, #FFD700, #FF8C00)', borderRadius: 3 }}
          />
        </div>
        <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
          {formatCurrency(balance)} / $10M — {formatCurrency(10_000_000 - balance)} to go!
        </div>
      </div>

      {/* Quick games row */}
      <div>
        <div style={{ fontSize: 11, color: '#555', letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase', fontWeight: 700 }}>
          QUICK PLAY
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[
            { emoji: '🪙', label: 'Coin Flip', game: 'coinflip' as const, color: '#FF6B6B' },
            { emoji: '🃏', label: 'Hi/Lo', game: 'higherlower' as const, color: '#a78bfa' },
            { emoji: '🎯', label: 'Plinko', game: 'plinko' as const, color: '#00FF94' },
            { emoji: '🐦', label: 'Flappy', game: 'flappy' as const, color: '#FFD700' },
          ].map(g => (
            <button
              key={g.game}
              onClick={() => { haptic.medium(); sound.playClick(); onGameSelect(g.game); }}
              style={{
                padding: '10px 4px',
                borderRadius: 14,
                background: `${g.color}22`,
                border: `1px solid ${g.color}55`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              <span style={{ fontSize: 22 }}>{g.emoji}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: g.color }}>{g.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* FOR YOU header */}
      <div style={{ fontSize: 11, color: '#555', letterSpacing: 2, marginTop: 4, textTransform: 'uppercase', fontWeight: 700 }}>
        FOR YOU ⚡
      </div>

      {/* Feed items */}
      {items.map((item, i) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i * 0.04, 0.3) }}
          onClick={() => handleAction(item)}
          style={{
            background: `linear-gradient(135deg, ${item.color}, rgba(255,255,255,0.03))`,
            borderRadius: 18,
            padding: '16px',
            border: `1px solid ${item.accentColor}33`,
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Shimmer bar */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: `linear-gradient(90deg, transparent, ${item.accentColor}, transparent)`,
            opacity: 0.6,
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: `${item.accentColor}22`,
              border: `1px solid ${item.accentColor}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, flexShrink: 0,
            }}>
              {item.emoji}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 2 }}>
                {item.title}
              </div>
              <div style={{ fontSize: 12, color: `${item.accentColor}cc` }}>
                {item.subtitle}
              </div>
            </div>

            {item.action === 'collect' ? (
              <div style={{
                padding: '8px 14px', borderRadius: 10,
                background: collectedItems.has(item.id)
                  ? 'rgba(255,255,255,0.1)'
                  : `linear-gradient(135deg, ${item.accentColor}, ${item.accentColor}cc)`,
                color: collectedItems.has(item.id) ? '#666' : '#000',
                fontSize: 12, fontWeight: 900, flexShrink: 0,
                fontFamily: 'Inter, sans-serif',
              }}>
                {collectedItems.has(item.id) ? '✓' : 'CLAIM'}
              </div>
            ) : (
              <div style={{
                padding: '8px 14px', borderRadius: 10,
                background: `${item.accentColor}22`,
                border: `1px solid ${item.accentColor}55`,
                color: item.accentColor, fontSize: 12, fontWeight: 900, flexShrink: 0,
              }}>
                PLAY →
              </div>
            )}
          </div>
        </motion.div>
      ))}

      {/* Loading indicator */}
      <div style={{ textAlign: 'center', padding: '16px 0', color: '#444', fontSize: 14 }}>
        Loading more... ⬇️
      </div>
    </div>
  );
};

export default InfiniteFeed;
