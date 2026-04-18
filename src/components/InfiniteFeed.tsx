import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency, getState, addBalance, sounds, haptics } from '../store/gameStore';
import type { GameId } from '../store/gameStore';

type CardType = 'game' | 'reward' | 'milestone' | 'taunt';

interface FeedCard {
  id: string;
  type: CardType;
  game?: GameId;
  rewardAmount?: number;
  text?: string;
  emoji?: string;
  bg: string;
  accentColor: string;
}

const GAME_CONFIGS: Array<{ id: GameId; emoji: string; label: string; sub: string; bg: string; border: string; glow: string; accent: string }> = [
  {
    id: 'coinflip',
    emoji: '🪙',
    label: 'Coin Flip',
    sub: '50/50 · Win 2×',
    bg: 'linear-gradient(135deg, rgba(255,107,107,0.15) 0%, rgba(255,140,0,0.1) 100%)',
    border: 'rgba(255,107,107,0.3)',
    glow: 'rgba(255,107,107,0.2)',
    accent: '#FF6B6B',
  },
  {
    id: 'higherlower',
    emoji: '🃏',
    label: 'Higher or Lower',
    sub: 'Chain wins · Up to 64×',
    bg: 'linear-gradient(135deg, rgba(167,139,250,0.15) 0%, rgba(124,58,237,0.1) 100%)',
    border: 'rgba(167,139,250,0.3)',
    glow: 'rgba(167,139,250,0.2)',
    accent: '#a78bfa',
  },
  {
    id: 'plinko',
    emoji: '🎯',
    label: 'Plinko',
    sub: 'Physics drop · 0.2×–2×',
    bg: 'linear-gradient(135deg, rgba(0,255,148,0.12) 0%, rgba(0,204,119,0.08) 100%)',
    border: 'rgba(0,255,148,0.25)',
    glow: 'rgba(0,255,148,0.15)',
    accent: '#00FF94',
  },
  {
    id: 'flappy',
    emoji: '🐦',
    label: 'Flappy Coins',
    sub: 'Collect coins · $5 each',
    bg: 'linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(255,140,0,0.08) 100%)',
    border: 'rgba(255,215,0,0.3)',
    glow: 'rgba(255,215,0,0.2)',
    accent: '#FFD700',
  },
];

const REWARD_AMOUNTS = [5, 10, 15, 20, 25, 50, 100];
const TAUNT_TEXTS = [
  { text: "You\'re on a roll! 🔥", emoji: "🎰" },
  { text: "One more game...", emoji: "😈" },
  { text: "Your lucky streak is coming", emoji: "⭐" },
  { text: "The big win is next", emoji: "💰" },
  { text: "Can\'t stop now!", emoji: "🚀" },
  { text: "You\'re so close to $10M", emoji: "🏆" },
  { text: "Just one more flip...", emoji: "🪙" },
  { text: "Today is your day", emoji: "✨" },
];

let cardCounter = 0;
function uid() { return `card_${++cardCounter}`; }

// Generate a shuffled sequence of game IDs with no adjacent duplicates
function generateGameSequence(count: number): GameId[] {
  const games: GameId[] = ['coinflip', 'higherlower', 'plinko', 'flappy'];
  const result: GameId[] = [];
  let last: GameId | null = null;
  for (let i = 0; i < count; i++) {
    const available = games.filter(g => g !== last);
    const pick = available[Math.floor(Math.random() * available.length)];
    result.push(pick);
    last = pick;
  }
  return result;
}

function generateCards(count: number, lastGame?: GameId): FeedCard[] {
  const cards: FeedCard[] = [];
  // Start with a game sequence of `count` length, intersperse rewards/taunts
  const gameSeq = generateGameSequence(count * 2);
  let gameIdx = 0;
  let lastCardGame: GameId | undefined = lastGame;

  for (let i = 0; i < count; i++) {
    const roll = Math.random();

    if (roll < 0.6) {
      // Game card — pick from pre-generated sequence, skip if same as last card's game
      let gId: GameId = gameSeq[gameIdx % gameSeq.length];
      if (gId === lastCardGame) {
        gameIdx++;
        gId = gameSeq[gameIdx % gameSeq.length];
      }
      gameIdx++;
      lastCardGame = gId;

      const cfg = GAME_CONFIGS.find(g => g.id === gId)!;
      cards.push({
        id: uid(),
        type: 'game',
        game: gId,
        bg: cfg.bg,
        accentColor: cfg.accent,
      });
    } else if (roll < 0.82) {
      // Reward card
      const amt = REWARD_AMOUNTS[Math.floor(Math.random() * REWARD_AMOUNTS.length)];
      cards.push({
        id: uid(),
        type: 'reward',
        rewardAmount: amt,
        bg: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(16,163,74,0.08) 100%)',
        accentColor: '#22c55e',
      });
    } else if (roll < 0.94) {
      // Taunt card
      const t = TAUNT_TEXTS[Math.floor(Math.random() * TAUNT_TEXTS.length)];
      cards.push({
        id: uid(),
        type: 'taunt',
        text: t.text,
        emoji: t.emoji,
        bg: 'linear-gradient(135deg, rgba(96,165,250,0.12) 0%, rgba(59,130,246,0.06) 100%)',
        accentColor: '#60a5fa',
      });
    } else {
      // Milestone card
      const { balance } = getState();
      const goal = 10_000_000;
      const pct = Math.min(100, (balance / goal) * 100);
      cards.push({
        id: uid(),
        type: 'milestone',
        bg: 'linear-gradient(135deg, rgba(255,215,0,0.12) 0%, rgba(255,140,0,0.06) 100%)',
        accentColor: '#FFD700',
        text: `${pct.toFixed(2)}% to $10M`,
      });
    }
  }

  return cards;
}

interface Props {
  onGameOpen: (game: GameId) => void;
}

export default function InfiniteFeed({ onGameOpen }: Props) {
  const [cards, setCards] = useState<FeedCard[]>(() => generateCards(12));
  const [claimedRewards, setClaimedRewards] = useState<Set<string>>(new Set());
  const loaderRef = useRef<HTMLDivElement>(null);

  // Load more at bottom
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setCards(prev => {
            const lastGame = [...prev].reverse().find(c => c.game)?.game;
            return [...prev, ...generateCards(8, lastGame)];
          });
        }
      },
      { threshold: 0.5 }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, []);

  const handleClaim = useCallback((card: FeedCard) => {
    if (claimedRewards.has(card.id)) return;
    setClaimedRewards(prev => new Set([...prev, card.id]));
    addBalance(card.rewardAmount ?? 0);
    sounds.reward();
    haptics.win();
  }, [claimedRewards]);

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      {cards.map((card, idx) => (
        <div
          key={card.id}
          className="fade-in"
          style={{ 
            transform: 'translate3d(0, 0, 0)',
            animationDelay: `${idx * 0.02}s`
          }}
        >
          <FeedCardView
            card={card}
            claimed={claimedRewards.has(card.id)}
            onGameOpen={onGameOpen}
            onClaim={handleClaim}
          />
        </div>
      ))}

      <div ref={loaderRef} className="flex items-center justify-center py-6 text-white/20 text-sm gap-2">
        <div className="w-2 h-2 rounded-full bg-white/20 animate-pulse" />
        <div className="w-2 h-2 rounded-full bg-white/20 animate-pulse" style={{ animationDelay: '0.2s' }} />
        <div className="w-2 h-2 rounded-full bg-white/20 animate-pulse" style={{ animationDelay: '0.4s' }} />
      </div>
    </div>
  );
}

// ── Individual card renderers ──────────────────────────────────

interface CardProps {
  card: FeedCard;
  claimed: boolean;
  onGameOpen: (game: GameId) => void;
  onClaim: (card: FeedCard) => void;
}

const FeedCardView = memo(function FeedCardView({ card, claimed, onGameOpen, onClaim }: CardProps) {
  if (card.type === 'game') return <GameCard card={card} onOpen={() => onGameOpen(card.game!)} />;
  if (card.type === 'reward') return <RewardCard card={card} claimed={claimed} onClaim={() => onClaim(card)} />;
  if (card.type === 'taunt') return <TauntCard card={card} />;
  if (card.type === 'milestone') return <MilestoneCard card={card} />;
  return null;
});

const GameCard = memo(function GameCard({ card, onOpen }: { card: FeedCard; onOpen: () => void }) {
  const cfg = GAME_CONFIGS.find(g => g.id === card.game)!;
  const [pressed, setPressed] = useState(false);

  return (
    <button
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onClick={() => { sounds.click(); haptics.medium(); onOpen(); }}
      className="w-full rounded-3xl p-5 flex items-center gap-4 text-left transition-all"
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        boxShadow: pressed
          ? `0 2px 12px ${cfg.glow}`
          : `0 6px 28px ${cfg.glow}, inset 0 1px 0 rgba(255,255,255,0.06)`,
        transform: pressed ? 'translate3d(0, 0, 0) scale(0.98)' : 'translate3d(0, 0, 0)',
        transition: 'all 0.15s ease',
      }}
    >
      {/* Icon */}
      <div
        className="shrink-0 text-4xl w-16 h-16 flex items-center justify-center rounded-2xl"
        style={{
          background: `${cfg.accent}18`,
          border: `1.5px solid ${cfg.accent}40`,
          boxShadow: `0 0 16px ${cfg.accent}20`,
        }}
      >
        {cfg.emoji}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-white font-bold text-lg leading-tight">{cfg.label}</div>
        <div className="text-white/50 text-sm mt-0.5">{cfg.sub}</div>
        {/* Mini visual hint */}
        <div
          className="mt-2 h-1 rounded-full w-16"
          style={{ background: `linear-gradient(90deg, ${cfg.accent}, transparent)` }}
        />
      </div>

      {/* Arrow */}
      <div
        className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold"
        style={{
          background: `${cfg.accent}20`,
          color: cfg.accent,
          border: `1px solid ${cfg.accent}40`,
        }}
      >
        ›
      </div>
    </button>
  );
});

const RewardCard = memo(function RewardCard({ card, claimed, onClaim }: { card: FeedCard; claimed: boolean; onClaim: () => void }) {
  return (
    <div
      className="w-full rounded-3xl p-5 flex items-center gap-4"
      style={{
        background: card.bg,
        border: `1px solid rgba(34,197,94,0.25)`,
        boxShadow: '0 4px 20px rgba(34,197,94,0.1)',
      }}
    >
      <div className="text-4xl w-14 h-14 flex items-center justify-center rounded-2xl shrink-0"
        style={{ background: 'rgba(34,197,94,0.12)', border: '1.5px solid rgba(34,197,94,0.3)' }}>
        🎁
      </div>
      <div className="flex-1">
        <div className="text-white font-bold text-base">Free Reward!</div>
        <div className="text-green-400 font-black text-xl">{formatCurrency(card.rewardAmount ?? 0)}</div>
        <div className="text-white/40 text-xs mt-0.5">Tap to claim instantly</div>
      </div>
      <AnimatePresence mode="wait">
        {claimed ? (
          <div
            key="claimed"
            className="shrink-0 text-green-400 font-bold text-sm fade-in"
          >
            ✓ Claimed
          </div>
        ) : (
          <button
            key="claim"
            onClick={onClaim}
            className="shrink-0 px-4 py-2 rounded-2xl font-bold text-black text-sm transition-transform active:scale-95"
            style={{
              background: 'linear-gradient(135deg,#22c55e,#16a34a)',
              boxShadow: '0 4px 16px rgba(34,197,94,0.4)',
            }}
          >
            Claim
          </button>
        )}
      </AnimatePresence>
    </div>
  );
});

const TauntCard = memo(function TauntCard({ card }: { card: FeedCard }) {
  return (
    <div
      className="w-full rounded-3xl p-5 text-center"
      style={{
        background: card.bg,
        border: '1px solid rgba(96,165,250,0.2)',
        boxShadow: '0 4px 20px rgba(96,165,250,0.08)',
      }}
    >
      <div className="text-5xl mb-2">{card.emoji}</div>
      <div className="text-white font-bold text-lg">{card.text}</div>
      <div className="text-white/30 text-xs mt-1">Keep scrolling...</div>
    </div>
  );
});

const MilestoneCard = memo(function MilestoneCard({ card }: { card: FeedCard }) {
  const { balance } = getState();
  const goal = 10_000_000;
  const pct = Math.min(100, (balance / goal) * 100);

  return (
    <div
      className="w-full rounded-3xl p-5"
      style={{
        background: card.bg,
        border: '1px solid rgba(255,215,0,0.2)',
        boxShadow: '0 4px 20px rgba(255,215,0,0.08)',
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="text-3xl">🏆</div>
        <div>
          <div className="text-white font-bold text-base">$10 Million Goal</div>
          <div className="text-yellow-400 text-sm font-semibold">{pct.toFixed(3)}% there</div>
        </div>
      </div>
      {/* Progress bar */}
      <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ 
            background: 'linear-gradient(90deg, #FFD700, #FF8C00)',
            width: `${Math.max(pct, 0.5)}%`
          }}
        />
      </div>
      <div className="flex justify-between mt-2 text-xs text-white/40">
        <span>{formatCurrency(balance)}</span>
        <span>$10M</span>
      </div>
    </div>
  );
});
