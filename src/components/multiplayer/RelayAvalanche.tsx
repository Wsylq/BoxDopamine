// ═══════════════════════════════════════════════════════════
// Avalanche — Auto-reveal tiles, team votes stop/continue
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { relayService } from '../../services/relayService';
import { sounds, haptics, formatCurrency, getState, addBalance } from '../../store/gameStore';

interface Props {
  isHost: boolean;
  onBack: () => void;
}

interface Player {
  id: string;
  username: string;
  bet: number;
  ready: boolean;
}

// waiting  = lobby
// revealing = host is about to flip the next tile (1.5s suspense)
// voting   = tile flipped safe, team votes continue/stop
// game_over = bomb hit or cashed out
type Phase = 'waiting' | 'revealing' | 'voting' | 'game_over';

interface TileState {
  isBomb: boolean;
  revealed: boolean;
}

interface GameState {
  gameType: 'avalanche';
  phase: Phase;
  tiles: TileState[];
  gridSize: number;
  bombCount: number;
  revealOrder: number[];   // pre-shuffled: safe tiles first, bombs last
  revealedCount: number;
  lastRevealedIndex: number; // tile index most recently flipped (-1 = none)
  multiplier: number;
  players: Player[];
  continueVotes: { [playerId: string]: boolean }; // true=continue false=stop
  votingActive: boolean;
  playAgainVotes: { [playerId: string]: boolean };
  playAgainActive: boolean;
  winner: boolean;
  bombHitIndex: number; // -1 = no bomb
}

function calcMultiplier(revealedSafe: number, totalSafe: number, bombCount: number): number {
  if (revealedSafe === 0) return 1.0;
  const totalTiles = totalSafe + bombCount;
  // Each reveal: probability of hitting safe tile = (remaining safe) / (remaining total)
  // Multiplier = (1 / cumulative survival probability) with house edge
  let cumulativeProb = 1.0;
  for (let i = 0; i < revealedSafe; i++) {
    const remainingTotal = totalTiles - i;
    const remainingSafe = totalSafe - i;
    cumulativeProb *= remainingSafe / remainingTotal;
  }
  // House edge: 4% (payout = 96% of fair odds)
  const fairMultiplier = 1 / cumulativeProb;
  const houseMultiplier = fairMultiplier * 0.96;
  return Math.max(1.0, parseFloat(houseMultiplier.toFixed(2)));
}

function buildBoard(gridSize: number, bombCount: number): { tiles: TileState[]; revealOrder: number[] } {
  const total = gridSize * gridSize;
  const tiles: TileState[] = Array.from({ length: total }, () => ({ isBomb: false, revealed: false }));
  
  // Place bombs randomly
  let placed = 0;
  while (placed < bombCount) {
    const idx = Math.floor(Math.random() * total);
    if (!tiles[idx].isBomb) { tiles[idx].isBomb = true; placed++; }
  }
  
  // TRUE RANDOM reveal order — bombs can appear anywhere EXCEPT the first tile
  const allIndices = Array.from({ length: total }, (_, i) => i);
  for (let i = allIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allIndices[i], allIndices[j]] = [allIndices[j], allIndices[i]];
  }

  // Guarantee first reveal is safe: if first tile is a bomb, swap it with the first safe tile
  if (tiles[allIndices[0]].isBomb) {
    const firstSafePos = allIndices.findIndex((idx, pos) => pos > 0 && !tiles[idx].isBomb);
    if (firstSafePos !== -1) {
      [allIndices[0], allIndices[firstSafePos]] = [allIndices[firstSafePos], allIndices[0]];
    }
  }
  
  return { tiles, revealOrder: allIndices };
}

// Danger colour: green → yellow → orange → red based on bombs remaining
function dangerColor(bombCount: number, totalTiles: number, revealed: number): string {
  const remaining = totalTiles - revealed;
  if (remaining <= 0) return '#22c55e';
  const danger = bombCount / remaining;
  if (danger < 0.15) return '#22c55e';
  if (danger < 0.30) return '#84cc16';
  if (danger < 0.45) return '#eab308';
  if (danger < 0.60) return '#f97316';
  return '#ef4444';
}

// ── Component ──────────────────────────────────────────────
export default function RelayAvalanche({ isHost, onBack }: Props) {
  const [game, setGame] = useState<GameState | null>(null);
  const [bet, setBet] = useState(100);
  const [myReady, setMyReady] = useState(false);
  // Joiners: relay is already connected when this component mounts (P2PMultiplayer
  // already received game_state before routing here). Start as connected=true for joiners.
  const [connected, setConnected] = useState(!isHost ? relayService.isConnected() : false);
  const [paidOut, setPaidOut] = useState(false);
  const [chat, setChat] = useState<{ username: string; msg: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const revealTimerRef = useRef<number | null>(null);
  const gameRef = useRef<GameState | null>(null);
  gameRef.current = game;

  const balance = getState().balance;
  const myId = relayService.myId;
  const myUsername = relayService.getUsername();

  // ── Host: init game state ────────────────────────────────
  // Wait until relayService.myId is populated (set after WS onopen)
  useEffect(() => {
    if (!isHost || game) return;
    // myId may be empty if WS hasn't opened yet — poll until ready
    const tryInit = () => {
      const id = relayService.myId;
      if (!id) {
        setTimeout(tryInit, 100);
        return;
      }
      const g: GameState = {
        gameType: 'avalanche',
        phase: 'waiting',
        tiles: [],
        gridSize: 5,
        bombCount: 5,
        revealOrder: [],
        revealedCount: 0,
        lastRevealedIndex: -1,
        multiplier: 1.0,
        players: [{ id, username: relayService.getUsername(), bet: 0, ready: false }],
        continueVotes: {},
        votingActive: false,
        playAgainVotes: {},
        playAgainActive: false,
        winner: false,
        bombHitIndex: -1,
      };
      setGame(g);
      setConnected(true);
    };
    tryInit();
  }, [isHost]);

  // ── Host: auto-reveal loop ───────────────────────────────
  // When phase becomes 'revealing', wait 1.8s then flip the tile
  useEffect(() => {
    if (!isHost || !game || game.phase !== 'revealing') return;
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);

    revealTimerRef.current = window.setTimeout(() => {
      const g = gameRef.current;
      if (!g || g.phase !== 'revealing') return;

      const nextIdx = g.revealOrder[g.revealedCount];
      const newTiles = g.tiles.map((t, i) => i === nextIdx ? { ...t, revealed: true } : t);
      const isBomb = g.tiles[nextIdx].isBomb;

      if (isBomb) {
        const updated: GameState = {
          ...g,
          tiles: newTiles,
          lastRevealedIndex: nextIdx,
          revealedCount: g.revealedCount + 1,
          bombHitIndex: nextIdx,
          phase: 'game_over',
          winner: false,
        };
        setGame(updated);
        relayService.send({ type: 'game_state', game: updated });
        sounds.flip();
        haptics.heavy();
      } else {
        const newRevealedCount = g.revealedCount + 1;
        // Count how many safe tiles have been revealed so far (for multiplier)
        const safeRevealed = newTiles.filter(t => t.revealed && !t.isBomb).length;
        const totalSafe = g.gridSize * g.gridSize - g.bombCount;
        // First safe tile is guaranteed — multiplier only starts from the 2nd safe reveal
        const newMult = calcMultiplier(Math.max(0, safeRevealed - 1), totalSafe, g.bombCount);
        // Win if all safe tiles are now revealed
        const allSafeRevealed = safeRevealed >= totalSafe;

        const updated: GameState = {
          ...g,
          tiles: newTiles,
          lastRevealedIndex: nextIdx,
          revealedCount: newRevealedCount,
          multiplier: newMult,
          phase: allSafeRevealed ? 'game_over' : 'voting',
          winner: allSafeRevealed,
          votingActive: !allSafeRevealed,
          continueVotes: {},
        };
        setGame(updated);
        relayService.send({ type: 'game_state', game: updated });
        sounds.flip();
        haptics.medium();
      }
    }, 1800);

    return () => { if (revealTimerRef.current) clearTimeout(revealTimerRef.current); };
  }, [isHost, game?.phase, game?.revealedCount]);

  // ── Relay message handler ────────────────────────────────
  useEffect(() => {
    const unsubStatus = relayService.onStatus(setConnected);

    const unsub = relayService.subscribe((data, _fromId) => {
      if (data.type === 'joined') {
        setConnected(true);
        if (!isHost) setTimeout(() => relayService.send({ type: 'request_state' }), 300);
        return;
      }
      if (data.type === 'player_joined') {
        setConnected(true);
        if (isHost && gameRef.current && data.userId !== myId) {
          const g = gameRef.current;
          // Only add players during the waiting phase — ignore joins mid-game
          if (g.phase !== 'waiting') {
            // Still send current state so late joiner sees the game
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
        setGame(incoming);
        setConnected(true);
        if (!incoming.phase || incoming.phase === 'waiting') {
          setMyReady(false);
          setPaidOut(false);
        }
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
          // Need at least 2 players and ALL must be ready before starting
          if (isHost && updated.players.length >= 2 && updated.players.every(p => p.ready)) {
            const { tiles, revealOrder } = buildBoard(updated.gridSize, updated.bombCount);
            const started: GameState = { ...updated, tiles, revealOrder, phase: 'revealing', revealedCount: 0, lastRevealedIndex: -1, multiplier: 1.0, bombHitIndex: -1, winner: false };
            setGame(started);
            relayService.send({ type: 'game_state', game: started });
          } else if (isHost) {
            relayService.send({ type: 'game_state', game: updated });
          }
        }
        return;
      }
      if (data.type === 'continue_vote') {
        if (!isHost) return;
        const g = gameRef.current;
        if (!g || !g.votingActive) return;
        const newVotes = { ...g.continueVotes, [data.playerId]: data.vote } as { [k: string]: boolean };
        const allVoted = g.players.every(p => newVotes[p.id] !== undefined);

        if (allVoted) {
          const stopCount = Object.values(newVotes).filter(v => v === false).length;
          const continueCount = Object.values(newVotes).filter(v => v === true).length;
          const shouldCashout = stopCount > continueCount; // majority stop wins; ties go to continue
          if (shouldCashout) {
            const updated: GameState = { ...g, continueVotes: newVotes, votingActive: false, phase: 'game_over', winner: true };
            setGame(updated);
            relayService.send({ type: 'game_state', game: updated });
          } else {
            const updated: GameState = { ...g, continueVotes: newVotes, votingActive: false, phase: 'revealing' };
            setGame(updated);
            relayService.send({ type: 'game_state', game: updated });
          }
        } else {
          // Not everyone voted yet — just broadcast updated votes
          const updated = { ...g, continueVotes: newVotes };
          setGame(updated);
          relayService.send({ type: 'game_state', game: updated });
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
              gameType: 'avalanche',
              phase: 'waiting', tiles: [], gridSize: g.gridSize, bombCount: g.bombCount,
              revealOrder: [], revealedCount: 0, lastRevealedIndex: -1, multiplier: 1.0,
              players: yes.map(p => ({ ...p, bet: 0, ready: false })),
              continueVotes: {}, votingActive: false,
              playAgainVotes: {}, playAgainActive: false,
              winner: false, bombHitIndex: -1,
            };
            setGame(fresh);
            setMyReady(false);
            relayService.send({ type: 'game_state', game: fresh });
          } else {
            const updated = { ...g, playAgainVotes: newVotes, playAgainActive: false };
            setGame(updated);
            relayService.send({ type: 'game_state', game: updated });
          }
        } else {
          const updated = { ...g, playAgainVotes: newVotes };
          setGame(updated);
          relayService.send({ type: 'game_state', game: updated });
        }
        return;
      }
      if (data.type === 'chat') {
        setChat(prev => [...prev, { username: data.username, msg: data.msg }]);
        sounds.click();
        return;
      }
    });

    return () => { unsubStatus(); unsub(); };
  }, [isHost, myId]);

  // ── Payout on win ────────────────────────────────────────
  useEffect(() => {
    if (!game) return;
    if (game.phase === 'game_over' && game.winner && !paidOut) {
      const me = game.players.find(p => p.id === myId);
      if (me && me.bet > 0) {
        addBalance(Math.floor(me.bet * game.multiplier));
        setPaidOut(true);
        sounds.reward();
        haptics.heavy();
      }
    }
    if (game.phase === 'waiting') setPaidOut(false);
  }, [game?.phase, game?.winner]);

  // ── Request state if non-host ────────────────────────────
  // Fire immediately on mount — relay is already connected for joiners
  useEffect(() => {
    if (isHost) return;
    // Small delay to let the subscription register first
    const t = setTimeout(() => relayService.send({ type: 'request_state' }), 200);
    return () => clearTimeout(t);
  }, [isHost]);

  // ── Actions ──────────────────────────────────────────────
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

    // Build updated state with host marked ready
    const updated = { ...game, players: game.players.map(p => p.id === myId ? { ...p, ready: true } : p) };
    setGame(updated);

    // Host: if ALL players (min 2) are ready, start
    if (isHost && updated.players.length >= 2 && updated.players.every(p => p.ready)) {
      const { tiles, revealOrder } = buildBoard(updated.gridSize, updated.bombCount);
      const started: GameState = { ...updated, tiles, revealOrder, phase: 'revealing', revealedCount: 0, lastRevealedIndex: -1, multiplier: 1.0, bombHitIndex: -1, winner: false };
      setGame(started);
      relayService.send({ type: 'game_state', game: started });
    } else if (isHost) {
      // Broadcast updated ready state so joiner sees host is ready
      relayService.send({ type: 'game_state', game: updated });
    }
    sounds.reward(); haptics.medium();
  };

  const submitContinueVote = (vote: boolean) => {
    if (!game || !game.votingActive) return;
    const newVotes = { ...game.continueVotes, [myId]: vote };
    const allVoted = game.players.every(p => newVotes[p.id] !== undefined);

    if (isHost) {
      if (allVoted) {
        const stopCount = Object.values(newVotes).filter(v => v === false).length;
        const continueCount = Object.values(newVotes).filter(v => v === true).length;
        const shouldCashout = stopCount > continueCount;
        if (shouldCashout) {
          const updated: GameState = { ...game, continueVotes: newVotes, votingActive: false, phase: 'game_over', winner: true };
          setGame(updated); relayService.send({ type: 'game_state', game: updated });
        } else {
          const updated: GameState = { ...game, continueVotes: newVotes, votingActive: false, phase: 'revealing' };
          setGame(updated); relayService.send({ type: 'game_state', game: updated });
        }
      } else {
        // Still waiting for other votes — broadcast current state
        const updated = { ...game, continueVotes: newVotes };
        setGame(updated); relayService.send({ type: 'game_state', game: updated });
      }
    } else {
      setGame({ ...game, continueVotes: newVotes });
      relayService.send({ type: 'continue_vote', playerId: myId, vote });
    }
    vote ? sounds.coin() : sounds.click();
    haptics.medium();
  };

  const submitPlayAgainVote = (vote: boolean) => {
    if (!game || !game.playAgainActive) return;
    if (isHost) {
      const newVotes = { ...game.playAgainVotes, [myId]: vote };
      const allVoted = game.players.every(p => newVotes[p.id] !== undefined);
      if (allVoted) {
        const yes = game.players.filter(p => newVotes[p.id] === true);
        if (yes.length >= 1) {
          const fresh: GameState = {
            gameType: 'avalanche',
            phase: 'waiting', tiles: [], gridSize: game.gridSize, bombCount: game.bombCount,
            revealOrder: [], revealedCount: 0, lastRevealedIndex: -1, multiplier: 1.0,
            players: yes.map(p => ({ ...p, bet: 0, ready: false })),
            continueVotes: {}, votingActive: false, playAgainVotes: {}, playAgainActive: false,
            winner: false, bombHitIndex: -1,
          };
          setGame(fresh); setMyReady(false); relayService.send({ type: 'game_state', game: fresh });
        } else {
          const updated = { ...game, playAgainVotes: newVotes, playAgainActive: false };
          setGame(updated); relayService.send({ type: 'game_state', game: updated });
        }
      } else {
        const updated = { ...game, playAgainVotes: newVotes };
        setGame(updated); relayService.send({ type: 'game_state', game: updated });
      }
    } else {
      setGame({ ...game, playAgainVotes: { ...game.playAgainVotes, [myId]: vote } });
      relayService.send({ type: 'play_again_vote', playerId: myId, vote });
    }
    sounds.click(); haptics.light();
  };

  const handleSendChat = () => {
    if (chatInput.trim()) {
      relayService.send({ type: 'chat', username: myUsername, msg: chatInput.trim() });
      setChat(prev => [...prev, { username: myUsername, msg: chatInput.trim() }]);
      setChatInput('');
    }
  };

  // ── Derived ──────────────────────────────────────────────
  const myPlayer = game?.players.find(p => p.id === myId);
  const totalTiles = game ? game.gridSize * game.gridSize : 25;
  const totalSafe = game ? totalTiles - game.bombCount : 20;
  const myVote = game?.continueVotes[myId];
  const hasVoted = myVote !== undefined;
  const dColor = game ? dangerColor(game.bombCount, totalTiles, game.tiles.filter(t => t.revealed).length) : '#22c55e';

  // ── Not connected ────────────────────────────────────────
  if (!connected) {
    return (
      <div className="h-full flex items-center justify-center px-5" style={{ background: '#000' }}>
        <div className="text-center">
          <div className="text-white text-lg mb-2">Connecting...</div>
          <div className="text-white/60 text-sm">Room: {relayService.getRoomId()}</div>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: '#000' }}>
        <div className="text-white">Waiting for host...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: '#0a0a0f', zIndex: 1000 }}>
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between flex-shrink-0">
        <button onClick={onBack} className="text-white/60 text-sm">← Back</button>
        <div className="text-white font-bold text-sm">🏔️ Avalanche</div>
        <button onClick={() => setShowChat(!showChat)} className="text-white/60 text-sm">💬</button>
      </div>

      {/* ── WAITING ROOM ── */}
      {game.phase === 'waiting' && (
        <div className="flex-1 px-5 overflow-y-auto pb-8">
          <div className="text-white font-black text-xl mb-4">Waiting Room</div>

          {/* Host settings */}
          {isHost && (
            <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)' }}>
              <div className="text-white font-bold text-sm mb-3">⚙️ Settings (Host)</div>
              <div className="text-white/60 text-xs mb-2">Bombs (more = higher payout, more danger)</div>
              <div className="flex gap-2">
                {[3, 5, 7, 10, 13].map(n => (
                  <button key={n}
                    onClick={() => { const u = { ...game, bombCount: n }; setGame(u); relayService.send({ type: 'game_state', game: u }); sounds.click(); }}
                    className="flex-1 py-2 rounded-lg font-bold text-sm"
                    style={{ background: game.bombCount === n ? '#fbbf24' : 'rgba(255,255,255,0.07)', color: game.bombCount === n ? '#000' : '#fff', border: `1px solid ${game.bombCount === n ? '#fbbf24' : 'rgba(255,255,255,0.1)'}` }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Rules */}
          <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)' }}>
            <div className="text-white font-bold text-sm mb-2">🏔️ How to Play</div>
            <div className="text-white/70 text-xs space-y-1">
              <div>• Tiles reveal automatically one by one</div>
              <div>• After each safe tile: vote <b>Continue</b> or <b>Stop</b></div>
              <div>• <b>Anyone</b> voting Stop = team cashes out safely</div>
              <div>• Hit a bomb = everyone loses their bet</div>
              <div>• More tiles revealed = higher multiplier 📈</div>
            </div>
          </div>

          {/* Bet */}
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

          {/* Players */}
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

      {/* ── GAME BOARD ── */}
      {(game.phase === 'revealing' || game.phase === 'voting' || game.phase === 'game_over') && (
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Stats bar */}
          <div className="px-5 mb-3 flex-shrink-0">
            <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${dColor}40` }}>
              <div className="flex justify-between items-center mb-2">
                <div className="text-center">
                  <div className="text-white/50 text-xs">Multiplier</div>
                  <motion.div key={game.multiplier} initial={{ scale: 1.3 }} animate={{ scale: 1 }}
                    className="font-black text-2xl" style={{ color: dColor }}>
                    {game.multiplier.toFixed(2)}x
                  </motion.div>
                </div>
                <div className="text-center">
                  <div className="text-white/50 text-xs">Your Win</div>
                  <div className="text-white font-bold text-lg">${formatCurrency((myPlayer?.bet || 0) * game.multiplier)}</div>
                </div>
                <div className="text-center">
                  <div className="text-white/50 text-xs">Tiles Left</div>
                  <div className="text-white font-bold text-lg">{game.tiles.filter(t => !t.revealed).length}</div>
                </div>
                <div className="text-center">
                  <div className="text-white/50 text-xs">Bombs</div>
                  <div className="font-bold text-lg" style={{ color: '#ef4444' }}>{game.bombCount}</div>
                </div>
              </div>
              {/* Danger bar */}
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <motion.div className="h-full rounded-full"
                  animate={{ width: `${(game.tiles.filter(t => t.revealed && !t.isBomb).length / totalSafe) * 100}%`, backgroundColor: dColor }}
                  transition={{ duration: 0.5 }} />
              </div>
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1 px-5 flex items-center justify-center overflow-hidden">
            <div className="grid gap-2 w-full" style={{ gridTemplateColumns: `repeat(${game.gridSize}, 1fr)`, maxWidth: 380 }}>
              {game.tiles.map((tile, idx) => {
                const isLast = idx === game.lastRevealedIndex;
                const isBombTile = idx === game.bombHitIndex;

                return (
                  <motion.div key={idx}
                    initial={false}
                    animate={tile.revealed ? { rotateY: 0 } : { rotateY: 0 }}
                    className="aspect-square rounded-xl flex items-center justify-center relative overflow-hidden"
                    style={{
                      background: tile.revealed
                        ? isBombTile ? 'rgba(239,68,68,0.25)' : 'rgba(34,197,94,0.15)'
                        : game.phase === 'revealing' && !tile.revealed ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.06)',
                      border: tile.revealed
                        ? isBombTile ? '1px solid rgba(239,68,68,0.6)' : '1px solid rgba(34,197,94,0.4)'
                        : '1px solid rgba(255,255,255,0.08)',
                      boxShadow: isLast && !isBombTile ? '0 0 16px rgba(34,197,94,0.5)' : isBombTile ? '0 0 20px rgba(239,68,68,0.7)' : 'none',
                    }}>

                    {/* Unrevealed: pulsing question mark during revealing phase */}
                    {!tile.revealed && (
                      <motion.div
                        animate={game.phase === 'revealing' && idx === game.revealOrder[game.revealedCount]
                          ? { scale: [1, 1.15, 1], opacity: [0.4, 1, 0.4] }
                          : { scale: 1, opacity: 0.25 }}
                        transition={{ repeat: game.phase === 'revealing' ? Infinity : 0, duration: 0.7 }}
                        className="text-white font-black text-lg">
                        ?
                      </motion.div>
                    )}

                    {/* Revealed safe */}
                    {tile.revealed && !tile.isBomb && (
                      <motion.div
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                        className="w-full h-full flex items-center justify-center">
                        <img src="/minesweeper-assets/gem.png" alt="gem"
                          className="w-full h-full object-contain p-0"
                          style={{ filter: 'drop-shadow(0 0 12px rgba(34,197,94,0.9))' }} />
                      </motion.div>
                    )}

                    {/* Revealed bomb */}
                    {tile.revealed && tile.isBomb && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: [0, 1.4, 1] }}
                        transition={{ duration: 0.4 }}
                        className="w-full h-full flex items-center justify-center">
                        <img src="/minesweeper-assets/bomb.png" alt="bomb"
                          className="w-full h-full object-contain"
                          style={{ filter: 'drop-shadow(0 0 10px rgba(255,100,100,0.8))', transform: 'scale(2.5)' }} />
                      </motion.div>
                    )}

                    {/* Shimmer on the next-to-reveal tile */}
                    {!tile.revealed && game.phase === 'revealing' && idx === game.revealOrder[game.revealedCount] && (
                      <motion.div className="absolute inset-0 rounded-xl"
                        animate={{ opacity: [0, 0.3, 0] }}
                        transition={{ repeat: Infinity, duration: 0.6 }}
                        style={{ background: 'linear-gradient(135deg, #fff, transparent)' }} />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* ── REVEALING phase: suspense bar ── */}
          {game.phase === 'revealing' && (
            <div className="px-5 py-4 flex-shrink-0">
              <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <motion.div className="text-white font-bold text-base mb-2"
                  animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
                  🎲 Revealing next tile...
                </motion.div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <motion.div className="h-full rounded-full"
                    initial={{ width: '0%' }} animate={{ width: '100%' }}
                    transition={{ duration: 1.8, ease: 'linear' }}
                    style={{ background: dColor }} />
                </div>
              </div>
            </div>
          )}

          {/* ── VOTING phase ── */}
          {game.phase === 'voting' && game.votingActive && (
            <div className="px-5 py-4 flex-shrink-0">
              <AnimatePresence>
                <motion.div key="vote-panel"
                  initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
                  className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${dColor}60` }}>

                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <div className="text-white font-bold text-sm">✅ Safe! What does the team do?</div>
                      <div className="text-white/50 text-xs">Majority decides — ties go to Continue</div>
                    </div>
                    <div className="text-right">
                      <div className="text-white/50 text-xs">Voted</div>
                      <div className="text-white font-bold text-sm">
                        {Object.keys(game.continueVotes).length}/{game.players.length}
                      </div>
                    </div>
                  </div>

                  {/* Vote buttons */}
                  {!hasVoted ? (
                    <div className="flex gap-3">
                      <button onClick={() => submitContinueVote(false)}
                        className="flex-1 py-3 rounded-xl font-bold text-sm"
                        style={{ background: 'rgba(34,197,94,0.15)', border: '2px solid #22c55e', color: '#22c55e' }}>
                        💰 Stop
                      </button>
                      <button onClick={() => submitContinueVote(true)}
                        className="flex-1 py-3 rounded-xl font-bold text-sm"
                        style={{ background: 'rgba(239,68,68,0.15)', border: '2px solid #ef4444', color: '#ef4444' }}>
                        🎲 Continue
                      </button>
                    </div>
                  ) : (
                    <div className="text-center text-white/60 text-sm py-2">
                      {myVote === false ? '💰 You voted Stop' : '🎲 You voted Continue'} — waiting for others...
                    </div>
                  )}

                  {/* Per-player vote status */}
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {game.players.map(p => {
                      const v = game.continueVotes[p.id];
                      return (
                        <div key={p.id} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
                          style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <span className="text-white/70">{p.username}</span>
                          <span>{v === undefined ? '⏳' : v ? '🎲' : '💰'}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Live tally */}
                  {Object.keys(game.continueVotes).length > 0 && (
                    <div className="flex gap-3 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="flex-1 text-center">
                        <div className="text-green-400 font-bold text-lg">
                          {Object.values(game.continueVotes).filter(v => v === false).length}
                        </div>
                        <div className="text-white/40 text-xs">Stop</div>
                      </div>
                      <div className="flex-1 text-center">
                        <div className="text-red-400 font-bold text-lg">
                          {Object.values(game.continueVotes).filter(v => v === true).length}
                        </div>
                        <div className="text-white/40 text-xs">Continue</div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          )}

          {/* ── GAME OVER ── */}
          {game.phase === 'game_over' && (
            <div className="px-5 py-4 flex-shrink-0">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="rounded-2xl p-5 text-center"
                style={{ background: game.winner ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${game.winner ? '#22c55e' : '#ef4444'}` }}>
                <div className="text-4xl mb-2">{game.winner ? '💰' : '💥'}</div>
                <div className="text-white font-black text-xl mb-1">
                  {game.winner ? 'Cashed Out!' : 'Avalanche!'}
                </div>
                <div className="text-white/70 text-sm mb-4">
                  {game.winner
                    ? `Everyone wins $${formatCurrency((myPlayer?.bet || 0) * game.multiplier)} (${game.multiplier.toFixed(2)}x)`
                    : 'A bomb was hit — everyone loses their bet.'}
                </div>

                {!game.playAgainActive ? (
                  <button onClick={() => {
                    const updated = { ...game, playAgainActive: true, playAgainVotes: {} };
                    if (isHost) { setGame(updated); relayService.send({ type: 'game_state', game: updated }); }
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
                      <div>
                        <div className="text-white/50 text-xs mb-2">Waiting for votes...</div>
                        <div className="flex gap-2 flex-wrap justify-center">
                          {game.players.map(p => (
                            <div key={p.id} className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }}>
                              {p.username} {game.playAgainVotes[p.id] === undefined ? '⏳' : game.playAgainVotes[p.id] ? '✅' : '❌'}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            </div>
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
              {chat.length === 0
                ? <div className="text-white/40 text-xs text-center py-4">No messages yet</div>
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
