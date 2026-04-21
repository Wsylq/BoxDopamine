// ═══════════════════════════════════════════════════════════
// Collective Blackjack — Team votes Hit or Stand each round
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { relayService } from '../../services/relayService';
import { sounds, haptics, formatCurrency, getState, addBalance } from '../../store/gameStore';
import InviteFriendsPanel from './InviteFriendsPanel';
import { achievementService } from '../../services/achievementService';

interface Props { isHost: boolean; onBack: () => void; }

interface Player { id: string; username: string; bet: number; ready: boolean; }

interface Card { suit: '♠' | '♥' | '♦' | '♣'; rank: string; value: number; }

// phase flow:
// waiting → dealing → voting → dealer_turn → game_over
type Phase = 'waiting' | 'dealing' | 'voting' | 'dealer_turn' | 'game_over';

type VoteAction = 'hit' | 'stand';

interface GameState {
  gameType: 'blackjack';
  phase: Phase;
  deck: Card[];
  playerHand: Card[];
  dealerHand: Card[];          // dealerHand[1] is face-down during voting
  dealerRevealed: boolean;     // true once dealer flips hole card
  playerTotal: number;
  dealerTotal: number;
  players: Player[];
  votes: { [playerId: string]: VoteAction };
  votingActive: boolean;
  result: 'win' | 'lose' | 'push' | null;
  playAgainVotes: { [playerId: string]: boolean };
  playAgainActive: boolean;
}

// ── Card helpers ───────────────────────────────────────────

function buildDeck(): Card[] {
  const suits: Card['suit'][] = ['♠', '♥', '♦', '♣'];
  const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  const deck: Card[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      const value = rank === 'A' ? 11 : ['J','Q','K'].includes(rank) ? 10 : parseInt(rank);
      deck.push({ suit, rank, value });
    }
  }
  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function handTotal(hand: Card[]): number {
  let total = hand.reduce((s, c) => s + c.value, 0);
  let aces = hand.filter(c => c.rank === 'A').length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function dealInitial(deck: Card[]): { playerHand: Card[]; dealerHand: Card[]; remaining: Card[] } {
  const d = [...deck];
  const playerHand = [d.pop()!, d.pop()!];
  const dealerHand = [d.pop()!, d.pop()!];
  return { playerHand, dealerHand, remaining: d };
}

function isRed(suit: Card['suit']) { return suit === '♥' || suit === '♦'; }

// ── Card component — true 3D flip ─────────────────────────

function PlayingCard({ card, faceDown = false, delay = 0 }: { card?: Card; faceDown?: boolean; delay?: number }) {
  // The card slides in from above and flips from face-down to face-up
  // We use a perspective wrapper + rotateY on the inner div
  const cardFace = (
    <div style={{
      width: 72, height: 104, borderRadius: 10,
      background: '#f8f8ff',
      border: '1px solid #ccc',
      boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
      position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', flexShrink: 0,
      backfaceVisibility: 'hidden',
    }}>
      {card && <>
        <div style={{ position: 'absolute', top: 5, left: 7, lineHeight: 1, color: isRed(card.suit) ? '#dc2626' : '#111' }}>
          <div style={{ fontSize: 15, fontWeight: 900, fontFamily: 'Georgia, serif' }}>{card.rank}</div>
          <div style={{ fontSize: 12, marginTop: -2 }}>{card.suit}</div>
        </div>
        <div style={{ fontSize: 32, color: isRed(card.suit) ? '#dc2626' : '#111', userSelect: 'none' }}>{card.suit}</div>
        <div style={{ position: 'absolute', bottom: 5, right: 7, lineHeight: 1, transform: 'rotate(180deg)', color: isRed(card.suit) ? '#dc2626' : '#111' }}>
          <div style={{ fontSize: 15, fontWeight: 900, fontFamily: 'Georgia, serif' }}>{card.rank}</div>
          <div style={{ fontSize: 12, marginTop: -2 }}>{card.suit}</div>
        </div>
      </>}
    </div>
  );

  const cardBack = (
    <div style={{
      width: 72, height: 104, borderRadius: 10,
      background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2040 50%, #1e3a5f 100%)',
      border: '2px solid rgba(255,255,255,0.15)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
      position: 'absolute', top: 0, left: 0,
      backfaceVisibility: 'hidden',
      transform: 'rotateY(180deg)',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 4, borderRadius: 7, border: '1px solid rgba(255,255,255,0.2)',
        background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 2px, transparent 2px, transparent 8px)' }} />
    </div>
  );

  return (
    // Perspective wrapper
    <motion.div
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.25, delay }}
      style={{ perspective: 600, flexShrink: 0, width: 72, height: 104 }}
    >
      {/* Inner flipper */}
      <motion.div
        initial={{ rotateY: faceDown ? 0 : 180 }}
        animate={{ rotateY: faceDown ? 180 : 0 }}
        transition={{ duration: 0.45, delay: delay + 0.1, ease: [0.4, 0, 0.2, 1] }}
        style={{ position: 'relative', width: '100%', height: '100%', transformStyle: 'preserve-3d' }}
      >
        {cardFace}
        {cardBack}
      </motion.div>
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────

export default function RelayBlackjack({ isHost, onBack }: Props) {
  const [game, setGame] = useState<GameState | null>(null);
  const [bet, setBet] = useState(100);
  const [myReady, setMyReady] = useState(false);
  const [connected, setConnected] = useState(!isHost ? relayService.isConnected() : false);
  const [paidOut, setPaidOut] = useState(false);
  const [chat, setChat] = useState<{ username: string; msg: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const gameRef = useRef<GameState | null>(null);
  gameRef.current = game;

  const balance = getState().balance;
  const myId = relayService.myId;
  const myUsername = relayService.getUsername();

  // ── Host init ──────────────────────────────────────────
  useEffect(() => {
    if (!isHost || game) return;
    const tryInit = () => {
      const id = relayService.myId;
      if (!id) { setTimeout(tryInit, 100); return; }
      const g: GameState = {
        gameType: 'blackjack', phase: 'waiting',
        deck: [], playerHand: [], dealerHand: [],
        dealerRevealed: false, playerTotal: 0, dealerTotal: 0,
        players: [{ id, username: relayService.getUsername(), bet: 0, ready: false }],
        votes: {}, votingActive: false, result: null,
        playAgainVotes: {}, playAgainActive: false,
      };
      setGame(g); setConnected(true);
    };
    tryInit();
  }, [isHost]);

  // ── Relay messages ─────────────────────────────────────
  useEffect(() => {
    const unsubStatus = relayService.onStatus(setConnected);
    const unsub = relayService.subscribe((data) => {
      if (data.type === 'joined') {
        setConnected(true);
        if (!isHost) setTimeout(() => relayService.send({ type: 'request_state' }), 300);
        return;
      }
      if (data.type === 'player_joined') {
        setConnected(true);
        if (isHost && gameRef.current && data.userId !== myId) {
          const g = gameRef.current;
          // Only add players during waiting phase — ignore joins mid-game
          if (g.phase !== 'waiting') {
            setTimeout(() => relayService.send({ type: 'game_state', game: g }), 100);
            return;
          }
          const already = g.players.some(p => p.username === data.username);
          const updated = already
            ? { ...g, players: g.players.map(p => p.username === data.username ? { ...p, id: data.userId } : p) }
            : { ...g, players: [...g.players, { id: data.userId, username: data.username, bet: 0, ready: false }] };
          setGame(updated);
          setTimeout(() => relayService.send({ type: 'game_state', game: updated }), 100);
        }
        return;
      }
      if (data.type === 'request_state') {
        if (isHost && gameRef.current) relayService.send({ type: 'game_state', game: gameRef.current });
        return;
      }
      if (data.type === 'game_state') {
        const incoming: GameState = data.game;
        setGame(incoming); setConnected(true);
        if (incoming.phase === 'waiting') { setMyReady(false); setPaidOut(false); }
        return;
      }
      if (data.type === 'bet_set') {
        if (gameRef.current) {
          const updated = { ...gameRef.current, players: gameRef.current.players.map(p => p.id === data.playerId ? { ...p, bet: data.bet } : p) };
          setGame(updated);
          if (isHost) relayService.send({ type: 'game_state', game: updated });
        }
        return;
      }
      if (data.type === 'ready') {
        if (gameRef.current) {
          const updated = { ...gameRef.current, players: gameRef.current.players.map(p => p.id === data.playerId ? { ...p, ready: true } : p) };
          setGame(updated);
          if (isHost && updated.players.length >= 2 && updated.players.every(p => p.ready)) {
            startRound(updated);
          } else if (isHost) {
            relayService.send({ type: 'game_state', game: updated });
          }
        }
        return;
      }
      if (data.type === 'bj_vote') {
        if (!isHost) return;
        const g = gameRef.current;
        if (!g || !g.votingActive) return;
        const newVotes = { ...g.votes, [data.playerId]: data.vote as VoteAction } as { [k: string]: VoteAction };
        const allVoted = g.players.every(p => newVotes[p.id] !== undefined);
        if (allVoted) {
          resolveVotes({ ...g, votes: newVotes });
        } else {
          const updated = { ...g, votes: newVotes };
          setGame(updated); relayService.send({ type: 'game_state', game: updated });
        }
        return;
      }
      if (data.type === 'play_again_vote') {
        if (!isHost) return;
        const g = gameRef.current;
        if (!g || !g.playAgainActive) return;
        const newVotes = { ...g.playAgainVotes, [data.playerId]: data.vote } as { [k: string]: boolean };
        const allVoted = g.players.every(p => newVotes[p.id] !== undefined);
        if (allVoted) {
          const yes = g.players.filter(p => newVotes[p.id] === true);
          if (yes.length >= 1) {
            const fresh: GameState = {
              gameType: 'blackjack', phase: 'waiting',
              deck: [], playerHand: [], dealerHand: [],
              dealerRevealed: false, playerTotal: 0, dealerTotal: 0,
              players: yes.map(p => ({ ...p, bet: 0, ready: false })),
              votes: {}, votingActive: false, result: null,
              playAgainVotes: {}, playAgainActive: false,
            };
            setGame(fresh); setMyReady(false);
            relayService.send({ type: 'game_state', game: fresh });
          } else {
            const updated = { ...g, playAgainVotes: newVotes, playAgainActive: false };
            setGame(updated); relayService.send({ type: 'game_state', game: updated });
          }
        } else {
          const updated = { ...g, playAgainVotes: newVotes };
          setGame(updated); relayService.send({ type: 'game_state', game: updated });
        }
        return;
      }
      if (data.type === 'chat') {
        setChat(prev => [...prev, { username: data.username, msg: data.msg }]);
        sounds.click(); return;
      }
    });
    return () => { unsubStatus(); unsub(); };
  }, [isHost, myId]);

  // ── Joiner: request state on mount ────────────────────
  useEffect(() => {
    if (isHost) return;
    const t = setTimeout(() => relayService.send({ type: 'request_state' }), 200);
    return () => clearTimeout(t);
  }, [isHost]);

  // ── Payout ─────────────────────────────────────────────
  useEffect(() => {
    if (!game || game.phase !== 'game_over' || paidOut) return;
    const me = game.players.find(p => p.id === myId);
    if (!me || me.bet <= 0) return;
    if (game.result === 'win') {
      addBalance(Math.floor(me.bet * 2));
      sounds.reward();
      haptics.blackjackWin();
      achievementService.unlock('bj_win');
      achievementService.unlock('play_multiplayer');
      // Natural 21 = 2 cards totalling 21
      if (game.playerHand.length === 2 && game.playerTotal === 21) {
        achievementService.unlock('bj_natural_21');
      }
      // Track wins count
      const wins = (parseInt(localStorage.getItem('bj_wins') || '0')) + 1;
      localStorage.setItem('bj_wins', String(wins));
      if (wins >= 5) achievementService.unlock('bj_win_5');
    } else if (game.result === 'push') {
      addBalance(me.bet);
      sounds.coin();
      haptics.medium();
    }
    setPaidOut(true);
  }, [game?.phase, game?.result]);

  // ── Host helpers ───────────────────────────────────────
  const startRound = (base: GameState) => {
    const deck = buildDeck();
    const { playerHand, dealerHand, remaining } = dealInitial(deck);
    const playerTotal = handTotal(playerHand);
    const dealerTotal = handTotal(dealerHand);
    // Natural blackjack check
    if (playerTotal === 21) {
      const updated: GameState = { ...base, deck: remaining, playerHand, dealerHand, dealerRevealed: true, playerTotal, dealerTotal, phase: 'game_over', result: dealerTotal === 21 ? 'push' : 'win', votes: {}, votingActive: false };
      setGame(updated); relayService.send({ type: 'game_state', game: updated }); return;
    }
    const updated: GameState = { ...base, deck: remaining, playerHand, dealerHand, dealerRevealed: false, playerTotal, dealerTotal, phase: 'voting', votes: {}, votingActive: true, result: null };
    setGame(updated); relayService.send({ type: 'game_state', game: updated });
    sounds.flip(); haptics.cardFlip();
  };

  const resolveVotes = (g: GameState) => {
    const hitCount = Object.values(g.votes).filter(v => v === 'hit').length;
    const standCount = Object.values(g.votes).filter(v => v === 'stand').length;
    const action: VoteAction = hitCount >= standCount ? 'hit' : 'stand'; // ties go to hit (more exciting)

    if (action === 'hit') {
      const newCard = g.deck[0];
      const newDeck = g.deck.slice(1);
      const newHand = [...g.playerHand, newCard];
      const newTotal = handTotal(newHand);
      if (newTotal > 21) {
        // Bust
        const updated: GameState = { ...g, deck: newDeck, playerHand: newHand, playerTotal: newTotal, dealerRevealed: true, dealerTotal: handTotal(g.dealerHand), phase: 'game_over', result: 'lose', votes: {}, votingActive: false };
        setGame(updated); relayService.send({ type: 'game_state', game: updated });
        sounds.flip(); haptics.blackjackBust();
      } else if (newTotal === 21) {
        // Auto-stand at 21
        runDealerTurn({ ...g, deck: newDeck, playerHand: newHand, playerTotal: newTotal, votes: {}, votingActive: false });
      } else {
        const updated: GameState = { ...g, deck: newDeck, playerHand: newHand, playerTotal: newTotal, phase: 'voting', votes: {}, votingActive: true };
        setGame(updated); relayService.send({ type: 'game_state', game: updated });
        sounds.flip(); haptics.cardFlip();
      }
    } else {
      // Stand — dealer plays
      runDealerTurn({ ...g, votes: {}, votingActive: false });
    }
  };

  const runDealerTurn = (g: GameState) => {
    let dealerHand = [...g.dealerHand];
    let deck = [...g.deck];
    // Dealer hits on soft 16 or less, stands on 17+
    while (handTotal(dealerHand) < 17) {
      dealerHand.push(deck.shift()!);
    }
    const dealerTotal = handTotal(dealerHand);
    const playerTotal = g.playerTotal;
    let result: 'win' | 'lose' | 'push';
    if (dealerTotal > 21 || playerTotal > dealerTotal) result = 'win';
    else if (playerTotal === dealerTotal) result = 'push';
    else result = 'lose';
    const updated: GameState = { ...g, deck, dealerHand, dealerTotal, dealerRevealed: true, phase: 'game_over', result, votes: {}, votingActive: false };
    setGame(updated); relayService.send({ type: 'game_state', game: updated });
    sounds.flip();
    if (result === 'win') haptics.blackjackWin();
    else if (result === 'lose') haptics.blackjackBust();
    else haptics.medium();
  };

  // ── Actions ────────────────────────────────────────────
  const handleSetBet = () => {
    if (bet < 10 || bet > balance) { alert('Invalid bet!'); return; }
    relayService.send({ type: 'bet_set', playerId: myId, bet });
    if (game) setGame({ ...game, players: game.players.map(p => p.id === myId ? { ...p, bet } : p) });
    sounds.coin(); haptics.light();
  };

  const handleReady = () => {
    if (!game) return;
    const me = game.players.find(p => p.id === myId);
    if (!me || me.bet === 0) { alert('Set your bet first!'); return; }
    addBalance(-me.bet);
    setMyReady(true);
    relayService.send({ type: 'ready', playerId: myId });
    const updated = { ...game, players: game.players.map(p => p.id === myId ? { ...p, ready: true } : p) };
    setGame(updated);
    if (isHost && updated.players.length >= 2 && updated.players.every(p => p.ready)) startRound(updated);
    else if (isHost) relayService.send({ type: 'game_state', game: updated });
    sounds.reward(); haptics.medium();
  };

  const submitVote = (vote: VoteAction) => {
    if (!game || !game.votingActive) return;
    const newVotes = { ...game.votes, [myId]: vote };
    const allVoted = game.players.every(p => newVotes[p.id] !== undefined);
    if (isHost) {
      if (allVoted) resolveVotes({ ...game, votes: newVotes });
      else { const u = { ...game, votes: newVotes }; setGame(u); relayService.send({ type: 'game_state', game: u }); }
    } else {
      setGame({ ...game, votes: newVotes });
      relayService.send({ type: 'bj_vote', playerId: myId, vote });
    }
    sounds.click(); haptics.medium();
  };

  const submitPlayAgainVote = (vote: boolean) => {
    if (!game || !game.playAgainActive) return;
    if (isHost) {
      const newVotes = { ...game.playAgainVotes, [myId]: vote } as { [k: string]: boolean };
      const allVoted = game.players.every(p => newVotes[p.id] !== undefined);
      if (allVoted) {
        const yes = game.players.filter(p => newVotes[p.id] === true);
        if (yes.length >= 1) {
          const fresh: GameState = {
            gameType: 'blackjack', phase: 'waiting',
            deck: [], playerHand: [], dealerHand: [],
            dealerRevealed: false, playerTotal: 0, dealerTotal: 0,
            players: yes.map(p => ({ ...p, bet: 0, ready: false })),
            votes: {}, votingActive: false, result: null,
            playAgainVotes: {}, playAgainActive: false,
          };
          setGame(fresh); setMyReady(false); relayService.send({ type: 'game_state', game: fresh });
        } else {
          const u = { ...game, playAgainVotes: newVotes, playAgainActive: false };
          setGame(u); relayService.send({ type: 'game_state', game: u });
        }
      } else {
        const u = { ...game, playAgainVotes: newVotes };
        setGame(u); relayService.send({ type: 'game_state', game: u });
      }
    } else {
      setGame({ ...game, playAgainVotes: { ...game.playAgainVotes, [myId]: vote } });
      relayService.send({ type: 'play_again_vote', playerId: myId, vote });
    }
    sounds.click(); haptics.light();
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    relayService.send({ type: 'chat', username: myUsername, msg: chatInput.trim() });
    setChat(prev => [...prev, { username: myUsername, msg: chatInput.trim() }]);
    setChatInput('');
  };

  // ── Derived ────────────────────────────────────────────
  const myPlayer = game?.players.find(p => p.id === myId);
  const myVote = game?.votes[myId];
  const hitCount = game ? Object.values(game.votes).filter(v => v === 'hit').length : 0;
  const standCount = game ? Object.values(game.votes).filter(v => v === 'stand').length : 0;
  const votedCount = game ? Object.keys(game.votes).length : 0;

  if (!connected) return (
    <div className="h-full flex items-center justify-center" style={{ background: '#0a0a12' }}>
      <div className="text-center"><div className="text-white text-lg mb-2">Connecting...</div>
        <div className="text-white/50 text-sm">Room: {relayService.getRoomId()}</div></div>
    </div>
  );
  if (!game) return (
    <div className="h-full flex items-center justify-center" style={{ background: '#0a0a12' }}>
      <div className="text-white">Waiting for host...</div>
    </div>
  );

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: 'linear-gradient(180deg, #0d3320 0%, #0a0a12 60%)', zIndex: 1000 }}>
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between flex-shrink-0">
        <button onClick={onBack} className="text-white/60 text-sm">← Back</button>
        <div className="text-white font-bold text-sm">🃏 Collective Blackjack</div>
        <button onClick={() => setShowChat(!showChat)} className="text-white/60 text-sm">💬</button>
      </div>

      {/* ── WAITING ROOM ── */}
      {game.phase === 'waiting' && (
        <div className="flex-1 px-5 overflow-y-auto pb-8">
          <div className="text-white font-black text-xl mb-4">Waiting Room</div>
          <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}>
            <div className="text-white font-bold text-sm mb-2">🃏 How to Play</div>
            <div className="text-white/70 text-xs space-y-1">
              <div>• Everyone shares one hand against the dealer</div>
              <div>• After each card: vote <b>Hit</b> or <b>Stand</b></div>
              <div>• Majority wins — ties go to Hit</div>
              <div>• Beat the dealer = everyone wins 2x their bet</div>
              <div>• Bust or lose = everyone loses their bet</div>
            </div>
          </div>

          {/* Invite friends — host only */}
          {isHost && <InviteFriendsPanel gameType="blackjack" currentPlayers={game.players.map(p => p.username)} />}
          {!myPlayer?.bet && (
            <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="text-white font-bold mb-2">Set Your Bet</div>
              <div className="text-white/50 text-xs mb-3">Balance: ${balance.toLocaleString()}</div>
              <input type="number" value={bet} onChange={e => setBet(parseInt(e.target.value) || 100)}
                className="w-full px-4 py-2 rounded-xl text-white mb-3"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }} />
              <button onClick={handleSetBet} className="w-full py-2 rounded-xl font-bold" style={{ background: '#22c55e', color: '#fff' }}>
                Confirm Bet
              </button>
            </div>
          )}
          <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="text-white font-bold mb-3">Players ({game.players.length})</div>
            {game.players.map(p => (
              <div key={p.id} className="flex justify-between items-center py-2">
                <div>
                  <div className="text-white text-sm">{p.username}{p.id === myId ? ' (you)' : ''}</div>
                  <div className="text-white/50 text-xs">{p.bet ? `$${p.bet}` : 'No bet'}</div>
                </div>
                <div className="text-xs font-bold" style={{ color: p.ready ? '#22c55e' : '#fbbf24' }}>
                  {p.ready ? '✓ Ready' : 'Waiting'}
                </div>
              </div>
            ))}
          </div>
          {myPlayer?.bet && !myReady && (
            <button onClick={handleReady} className="w-full py-3 rounded-xl font-bold"
              style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#000' }}>
              Ready!
            </button>
          )}
        </div>
      )}

      {/* ── GAME TABLE ── */}
      {(game.phase === 'voting' || game.phase === 'dealer_turn' || game.phase === 'game_over') && (
        <div className="flex-1 flex flex-col overflow-hidden px-5">

          {/* Dealer hand */}
          <div className="mb-4 flex-shrink-0">
            <div className="text-white/60 text-xs mb-2 text-center">
              DEALER {game.dealerRevealed ? `— ${game.dealerTotal}` : `— ${game.dealerHand[0]?.value ?? '?'} + ?`}
            </div>
            <div className="flex gap-2 justify-center">
              {game.dealerHand.map((card, i) => (
                <PlayingCard key={i} card={card} faceDown={!game.dealerRevealed && i === 1} delay={i * 0.1} />
              ))}
            </div>
          </div>

          {/* VS divider */}
          <div className="flex items-center gap-3 mb-4 flex-shrink-0">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <div className="text-white/30 text-xs font-bold">VS</div>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.1)' }} />
          </div>

          {/* Player hand */}
          <div className="mb-4 flex-shrink-0">
            <div className="text-white/60 text-xs mb-2 text-center">
              TEAM — <span className="font-bold" style={{ color: game.playerTotal > 21 ? '#ef4444' : game.playerTotal === 21 ? '#fbbf24' : '#fff' }}>
                {game.playerTotal}
              </span>
              {game.playerTotal > 21 && ' BUST'}
              {game.playerTotal === 21 && ' BLACKJACK!'}
            </div>
            <div className="flex gap-2 justify-center flex-wrap">
              {game.playerHand.map((card, i) => (
                <PlayingCard key={i} card={card} delay={i * 0.1} />
              ))}
            </div>
          </div>

          {/* Pot info */}
          <div className="rounded-xl p-3 mb-3 flex-shrink-0 flex justify-between"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="text-center">
              <div className="text-white/50 text-xs">Your Bet</div>
              <div className="text-white font-bold">${myPlayer?.bet ?? 0}</div>
            </div>
            <div className="text-center">
              <div className="text-white/50 text-xs">Win</div>
              <div className="text-green-400 font-bold">${(myPlayer?.bet ?? 0) * 2}</div>
            </div>
            <div className="text-center">
              <div className="text-white/50 text-xs">Team Pot</div>
              <div className="text-white font-bold">${game.players.reduce((s, p) => s + p.bet, 0)}</div>
            </div>
          </div>

          {/* ── VOTING ── */}
          {game.phase === 'voting' && game.votingActive && (
            <AnimatePresence>
              <motion.div key="vote" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                className="rounded-2xl p-4 flex-shrink-0"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <div className="flex justify-between items-center mb-3">
                  <div className="text-white font-bold text-sm">Team vote</div>
                  <div className="text-white/50 text-xs">{votedCount}/{game.players.length} voted</div>
                </div>
                {!myVote ? (
                  <div className="flex gap-3 mb-3">
                    <button onClick={() => submitVote('hit')}
                      className="flex-1 py-3 rounded-xl font-black text-lg"
                      style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', boxShadow: '0 4px 16px rgba(239,68,68,0.4)' }}>
                      🎯 HIT
                    </button>
                    <button onClick={() => submitVote('stand')}
                      className="flex-1 py-3 rounded-xl font-black text-lg"
                      style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', boxShadow: '0 4px 16px rgba(34,197,94,0.4)' }}>
                      ✋ STAND
                    </button>
                  </div>
                ) : (
                  <div className="text-center text-white/60 text-sm py-2 mb-3">
                    You voted <b style={{ color: myVote === 'hit' ? '#ef4444' : '#22c55e' }}>{myVote.toUpperCase()}</b> — waiting...
                  </div>
                )}
                {/* Live tally */}
                <div className="flex gap-2">
                  {game.players.map(p => {
                    const v = game.votes[p.id];
                    return (
                      <div key={p.id} className="flex-1 text-center px-2 py-1 rounded-lg text-xs"
                        style={{ background: v === 'hit' ? 'rgba(239,68,68,0.15)' : v === 'stand' ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)' }}>
                        <div className="text-white/70">{p.username.split('')[0].toUpperCase()}</div>
                        <div style={{ color: v === 'hit' ? '#ef4444' : v === 'stand' ? '#22c55e' : '#ffffff40' }}>
                          {v === 'hit' ? '🎯' : v === 'stand' ? '✋' : '⏳'}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {votedCount > 0 && (
                  <div className="flex gap-3 mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex-1 text-center text-xs">
                      <span className="font-bold" style={{ color: '#ef4444' }}>{hitCount}</span>
                      <span className="text-white/40"> Hit</span>
                    </div>
                    <div className="flex-1 text-center text-xs">
                      <span className="font-bold" style={{ color: '#22c55e' }}>{standCount}</span>
                      <span className="text-white/40"> Stand</span>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}

          {/* ── GAME OVER ── */}
          {game.phase === 'game_over' && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="rounded-2xl p-5 text-center flex-shrink-0"
              style={{
                background: game.result === 'win' ? 'rgba(34,197,94,0.15)' : game.result === 'push' ? 'rgba(251,191,36,0.15)' : 'rgba(239,68,68,0.15)',
                border: `1px solid ${game.result === 'win' ? '#22c55e' : game.result === 'push' ? '#fbbf24' : '#ef4444'}`,
              }}>
              <div className="text-4xl mb-2">{game.result === 'win' ? '🎉' : game.result === 'push' ? '🤝' : '💸'}</div>
              <div className="text-white font-black text-xl mb-1">
                {game.result === 'win' ? 'Team Wins!' : game.result === 'push' ? 'Push — Tie!' : game.playerTotal > 21 ? 'Bust!' : 'Dealer Wins'}
              </div>
              <div className="text-white/70 text-sm mb-4">
                {game.result === 'win' && `You win $${formatCurrency((myPlayer?.bet ?? 0) * 2)}`}
                {game.result === 'push' && 'Bet returned'}
                {game.result === 'lose' && 'Better luck next time'}
              </div>
              <div className="text-white/50 text-xs mb-4">
                Team: {game.playerTotal} | Dealer: {game.dealerTotal}
              </div>
              {!game.playAgainActive ? (
                <button onClick={() => {
                  const u = { ...game, playAgainActive: true, playAgainVotes: {} };
                  if (isHost) { setGame(u); relayService.send({ type: 'game_state', game: u }); }
                  else relayService.send({ type: 'play_again_vote', playerId: myId, vote: true });
                  sounds.coin(); haptics.light();
                }} className="w-full py-3 rounded-xl font-bold"
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff' }}>
                  🔄 Play Again
                </button>
              ) : (
                <div>
                  {game.playAgainVotes[myId] === undefined ? (
                    <div className="flex gap-2">
                      <button onClick={() => submitPlayAgainVote(false)}
                        className="flex-1 py-2 rounded-xl font-bold text-sm"
                        style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', color: '#ef4444' }}>No</button>
                      <button onClick={() => submitPlayAgainVote(true)}
                        className="flex-1 py-2 rounded-xl font-bold text-sm"
                        style={{ background: '#22c55e', color: '#fff' }}>Yes</button>
                    </div>
                  ) : (
                    <div className="flex gap-2 flex-wrap justify-center">
                      {game.players.map(p => (
                        <div key={p.id} className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          {p.username} {game.playAgainVotes[p.id] === undefined ? '⏳' : game.playAgainVotes[p.id] ? '✅' : '❌'}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </div>
      )}

      {/* ── CHAT ── */}
      <AnimatePresence>
        {showChat && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            className="absolute bottom-0 left-0 right-0 flex flex-col"
            style={{ background: 'rgba(0,0,0,0.96)', backdropFilter: 'blur(10px)', zIndex: 200, maxHeight: '55vh', borderTopLeftRadius: 24, borderTopRightRadius: 24, border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none' }}>
            <div className="px-5 py-3 flex justify-between items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <span className="text-white font-bold text-sm">💬 Chat</span>
              <button onClick={() => setShowChat(false)} className="text-white/60 text-xl">×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
              {chat.length === 0 ? <div className="text-white/40 text-xs text-center py-4">No messages yet</div>
                : chat.map((c, i) => (
                  <div key={i} className={c.username === myUsername ? 'text-right' : ''}>
                    <div className="text-white/40 text-xs mb-1">{c.username}</div>
                    <div className="inline-block px-3 py-2 rounded-xl text-sm"
                      style={{ background: c.username === myUsername ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)', color: '#fff' }}>
                      {c.msg}
                    </div>
                  </div>
                ))}
            </div>
            <div className="px-5 py-3 flex gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleSendChat()}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 rounded-xl text-white text-sm"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }} />
              <button onClick={handleSendChat} className="px-5 py-2 rounded-xl font-bold text-sm" style={{ background: '#22c55e', color: '#fff' }}>Send</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}