// ═══════════════════════════════════════════════════════════
// P2P Minesweeper Game
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { p2pService } from '../../services/p2pService';
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

interface GameState {
  grid: { isMine: boolean; adjacentMines: number }[][];
  revealed: boolean[][];
  currentTurn: number;
  multiplier: number;
  gameOver: boolean;
  winner: boolean;
  players: Player[];
  started: boolean;
}

export default function P2PMinesweeper({ isHost, onBack }: Props) {
  const [game, setGame] = useState<GameState | null>(null);
  const [bet, setBet] = useState(100);
  const [myReady, setMyReady] = useState(false);
  const [chat, setChat] = useState<{ username: string; msg: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);

  const balance = getState().balance;
  const myId = p2pService.myId;
  const myUsername = p2pService.getUsername();

  // Host: Initialize game
  useEffect(() => {
    if (isHost && !game) {
      const newGame: GameState = {
        grid: [],
        revealed: [],
        currentTurn: 0,
        multiplier: 1.0,
        gameOver: false,
        winner: false,
        players: [{ id: myId, username: myUsername, bet: 0, ready: false }],
        started: false,
      };
      setGame(newGame);
    }
  }, [isHost]);

  // Listen for P2P messages
  useEffect(() => {
    const unsub = p2pService.subscribe((data, peerId) => {
      console.log('Received:', data.type, data);
      
      if (data.type === 'join') {
        // Host: Add player
        if (isHost && game) {
          const updated = {
            ...game,
            players: [...game.players, { id: peerId, username: data.username, bet: 0, ready: false }],
          };
          setGame(updated);
          p2pService.send({ type: 'game_state', game: updated }, peerId);
        }
      } else if (data.type === 'game_state') {
        // Player: Receive game state
        setGame(data.game);
      } else if (data.type === 'bet_set') {
        // Update player bet
        if (game) {
          const updated = {
            ...game,
            players: game.players.map(p => 
              p.id === data.playerId ? { ...p, bet: data.bet } : p
            ),
          };
          setGame(updated);
          if (isHost) p2pService.send({ type: 'game_state', game: updated });
        }
      } else if (data.type === 'ready') {
        // Mark player ready
        if (game) {
          const updated = {
            ...game,
            players: game.players.map(p => 
              p.id === data.playerId ? { ...p, ready: true } : p
            ),
          };
          setGame(updated);
          
          // Host: Check if all ready, start game
          if (isHost && updated.players.every(p => p.ready)) {
            const gridSize = 5;
            const mineCount = 6;
            const grid = createGrid(gridSize, mineCount);
            const started = {
              ...updated,
              grid,
              revealed: Array(gridSize).fill(null).map(() => Array(gridSize).fill(false)),
              started: true,
            };
            setGame(started);
            p2pService.send({ type: 'game_state', game: started });
          } else if (isHost) {
            p2pService.send({ type: 'game_state', game: updated });
          }
        }
      } else if (data.type === 'move') {
        // Process move
        if (game && isHost) {
          const result = revealCell(game, data.row, data.col);
          setGame(result);
          p2pService.send({ type: 'game_state', game: result });
          
          // Handle game over
          if (result.gameOver) {
            setTimeout(() => {
              result.players.forEach(p => {
                if (result.winner) {
                  const payout = Math.floor(p.bet * result.multiplier);
                  if (p.id === myId) addBalance(payout);
                }
              });
            }, 1000);
          }
        }
      } else if (data.type === 'chat') {
        setChat(prev => [...prev, { username: data.username, msg: data.msg }]);
        sounds.click();
      }
    });
    return unsub;
  }, [game, isHost]);

  // Player: Send join request
  useEffect(() => {
    if (!isHost && !game) {
      p2pService.send({ type: 'join', username: myUsername });
    }
  }, [isHost]);

  const handleSetBet = () => {
    if (bet < 10 || bet > balance) {
      alert('Invalid bet amount!');
      return;
    }
    
    p2pService.send({ type: 'bet_set', playerId: myId, bet });
    if (game) {
      const updated = {
        ...game,
        players: game.players.map(p => 
          p.id === myId ? { ...p, bet } : p
        ),
      };
      setGame(updated);
    }
    sounds.coin();
    haptics.light();
  };

  const handleReady = () => {
    if (!game) return;
    const myPlayer = game.players.find(p => p.id === myId);
    if (!myPlayer || myPlayer.bet === 0) {
      alert('Set your bet first!');
      return;
    }
    
    addBalance(-myPlayer.bet); // Deduct bet
    setMyReady(true);
    p2pService.send({ type: 'ready', playerId: myId });
    
    if (game) {
      const updated = {
        ...game,
        players: game.players.map(p => 
          p.id === myId ? { ...p, ready: true } : p
        ),
      };
      setGame(updated);
    }
    sounds.reward();
    haptics.medium();
  };

  const handleMove = (row: number, col: number) => {
    if (!game || !game.started || game.gameOver || game.revealed[row][col]) return;
    
    const myIndex = game.players.findIndex(p => p.id === myId);
    if (game.currentTurn !== myIndex) return;

    p2pService.send({ type: 'move', row, col });
    sounds.flip();
    haptics.light();
  };

  const handleSendChat = () => {
    if (chatInput.trim()) {
      p2pService.send({ type: 'chat', username: myUsername, msg: chatInput.trim() });
      setChat(prev => [...prev, { username: myUsername, msg: chatInput.trim() }]);
      setChatInput('');
    }
  };

  if (!game) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: '#000' }}>
        <div className="text-white">Connecting...</div>
      </div>
    );
  }

  const myPlayer = game.players.find(p => p.id === myId);
  const isMyTurn = game.started && game.players[game.currentTurn]?.id === myId;

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: '#000', zIndex: 1000 }}>
      <div className="px-5 py-4 flex items-center justify-between">
        <button onClick={onBack} className="text-white/60 text-sm">← Back</button>
        <div className="text-white font-bold text-sm">Minesweeper</div>
        <button onClick={() => setShowChat(!showChat)} className="text-white/60 text-sm">💬</button>
      </div>

      {/* Waiting Room */}
      {!game.started && (
        <div className="flex-1 px-5 overflow-y-auto">
          <div className="text-white font-bold text-lg mb-4">Waiting Room</div>
          
          {/* Set Bet */}
          {!myPlayer?.bet && (
            <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="text-white font-bold mb-2">Set Your Bet</div>
              <div className="text-white/60 text-xs mb-3">Balance: ${balance}</div>
              <input
                type="number"
                value={bet}
                onChange={(e) => setBet(parseInt(e.target.value) || 100)}
                className="w-full px-4 py-2 rounded-xl text-white mb-3"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
              />
              <button
                onClick={handleSetBet}
                className="w-full py-2 rounded-xl font-bold"
                style={{ background: '#22c55e', color: '#fff' }}
              >
                Set Bet
              </button>
            </div>
          )}

          {/* Players */}
          <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="text-white font-bold mb-3">Players ({game.players.length})</div>
            {game.players.map(p => (
              <div key={p.id} className="flex justify-between items-center py-2">
                <div>
                  <div className="text-white text-sm">{p.username}</div>
                  <div className="text-white/60 text-xs">${p.bet || 'Not set'}</div>
                </div>
                <div className="text-xs" style={{ color: p.ready ? '#22c55e' : '#fbbf24' }}>
                  {p.ready ? '✓ Ready' : 'Waiting...'}
                </div>
              </div>
            ))}
          </div>

          {/* Ready Button */}
          {myPlayer?.bet && !myReady && (
            <button
              onClick={handleReady}
              className="w-full py-3 rounded-xl font-bold"
              style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#000' }}
            >
              Ready!
            </button>
          )}
        </div>
      )}

      {/* Game Started */}
      {game.started && (
        <>
          {/* Status */}
          <div className="px-5 mb-4">
            <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex justify-between mb-2">
                <span className="text-white/60 text-xs">Multiplier</span>
                <span className="text-white font-black text-xl">{game.multiplier.toFixed(2)}x</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-white/60 text-xs">Your Bet</span>
                <span className="text-white font-bold">${myPlayer?.bet || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60 text-xs">Potential Win</span>
                <span className="text-white font-bold">${formatCurrency((myPlayer?.bet || 0) * game.multiplier)}</span>
              </div>
              {!game.gameOver && (
                <div className="mt-2 pt-2 text-white/60 text-xs" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  {isMyTurn ? '🟢 Your turn!' : `⏳ ${game.players[game.currentTurn]?.username}'s turn`}
                </div>
              )}
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1 px-5 overflow-auto">
            <div className="grid gap-1 mx-auto" style={{ gridTemplateColumns: `repeat(${game.grid.length}, 1fr)`, maxWidth: 400 }}>
              {game.grid.map((row, i) =>
                row.map((cell, j) => (
                  <motion.button
                    key={`${i}-${j}`}
                    onClick={() => handleMove(i, j)}
                    disabled={!isMyTurn || game.revealed[i][j] || game.gameOver}
                    whileTap={{ scale: 0.95 }}
                    className="aspect-square rounded-lg font-bold text-sm flex items-center justify-center"
                    style={{
                      background: game.revealed[i][j]
                        ? cell.isMine ? '#ef4444' : cell.adjacentMines === 0 ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.12)'
                        : 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      cursor: isMyTurn && !game.revealed[i][j] && !game.gameOver ? 'pointer' : 'default',
                    }}
                  >
                    {game.revealed[i][j] && (cell.isMine ? '💣' : cell.adjacentMines || '')}
                  </motion.button>
                ))
              )}
            </div>

            {/* Game Over */}
            {game.gameOver && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mt-4 rounded-2xl p-6 text-center"
                style={{
                  background: game.winner ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
                  border: `1px solid ${game.winner ? '#22c55e' : '#ef4444'}`,
                }}
              >
                <div className="text-4xl mb-2">{game.winner ? '🎉' : '💥'}</div>
                <div className="text-white font-black text-xl mb-2">
                  {game.winner ? 'Victory!' : 'Game Over'}
                </div>
                <div className="text-white/80 text-sm">
                  {game.winner
                    ? `You won ${formatCurrency((myPlayer?.bet || 0) * game.multiplier)}!`
                    : 'Hit a mine! Better luck next time.'}
                </div>
              </motion.div>
            )}
          </div>
        </>
      )}

      {/* Chat */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="absolute inset-0 flex flex-col"
            style={{ background: '#000', zIndex: 200 }}
          >
            <div className="px-5 py-4 flex justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <span className="text-white font-bold">Chat</span>
              <button onClick={() => setShowChat(false)} className="text-white/60">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {chat.map((c, i) => (
                <div key={i} className={c.username === myUsername ? 'text-right' : ''}>
                  <div className="text-white/40 text-xs mb-1">{c.username}</div>
                  <div className="inline-block px-4 py-2 rounded-2xl text-sm" style={{
                    background: c.username === myUsername ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)',
                    color: '#fff',
                  }}>
                    {c.msg}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 flex gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="Message..."
                className="flex-1 px-4 py-2 rounded-xl text-white text-sm"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
              />
              <button onClick={handleSendChat} className="px-6 py-2 rounded-xl font-bold text-sm" style={{ background: '#22c55e', color: '#fff' }}>
                Send
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper functions
function createGrid(size: number, mines: number) {
  const grid = Array(size).fill(null).map(() =>
    Array(size).fill(null).map(() => ({ isMine: false, adjacentMines: 0 }))
  );

  let placed = 0;
  while (placed < mines) {
    const r = Math.floor(Math.random() * size);
    const c = Math.floor(Math.random() * size);
    if (!grid[r][c].isMine) {
      grid[r][c].isMine = true;
      placed++;
    }
  }

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if (!grid[i][j].isMine) {
        let count = 0;
        for (let di = -1; di <= 1; di++) {
          for (let dj = -1; dj <= 1; dj++) {
            const ni = i + di, nj = j + dj;
            if (ni >= 0 && ni < size && nj >= 0 && nj < size && grid[ni][nj].isMine) count++;
          }
        }
        grid[i][j].adjacentMines = count;
      }
    }
  }

  return grid;
}

function revealCell(game: GameState, row: number, col: number): GameState {
  const newRevealed = game.revealed.map(r => [...r]);
  newRevealed[row][col] = true;

  const cell = game.grid[row][col];
  if (cell.isMine) {
    return { ...game, revealed: newRevealed, gameOver: true, winner: false };
  }

  const totalCells = game.grid.length * game.grid.length;
  const mineCount = game.grid.flat().filter(c => c.isMine).length;
  const revealedCount = newRevealed.flat().filter(Boolean).length;
  const newMultiplier = 1 + (revealedCount / (totalCells - mineCount)) * 2;

  const allRevealed = revealedCount === totalCells - mineCount;

  return {
    ...game,
    revealed: newRevealed,
    multiplier: newMultiplier,
    currentTurn: (game.currentTurn + 1) % game.players.length,
    gameOver: allRevealed,
    winner: allRevealed,
  };
}
