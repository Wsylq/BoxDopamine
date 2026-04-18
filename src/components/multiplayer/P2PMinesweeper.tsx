// ═══════════════════════════════════════════════════════════
// P2P Minesweeper Game
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { p2pService } from '../../services/p2pService';
import { sounds, haptics, formatCurrency, getState, addBalance } from '../../store/gameStore';

interface Props {
  isHost: boolean;
  onBack: () => void;
}

interface GameState {
  grid: { isMine: boolean; adjacentMines: number }[][];
  revealed: boolean[][];
  currentTurn: number;
  multiplier: number;
  gameOver: boolean;
  winner: boolean;
  players: { id: string; bet: number }[];
}

export default function P2PMinesweeper({ isHost, onBack }: Props) {
  const [game, setGame] = useState<GameState | null>(null);
  const [bet, setBet] = useState(100);
  const [ready, setReady] = useState(false);
  const [chat, setChat] = useState<{ id: string; msg: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);

  const balance = getState().balance;
  const myId = p2pService.myId;

  // Host: Initialize game
  useEffect(() => {
    if (isHost && !game) {
      const gridSize = 5;
      const mineCount = 6;
      const grid = createGrid(gridSize, mineCount);
      
      const newGame: GameState = {
        grid,
        revealed: Array(gridSize).fill(null).map(() => Array(gridSize).fill(false)),
        currentTurn: 0,
        multiplier: 1.0,
        gameOver: false,
        winner: false,
        players: [{ id: myId, bet }],
      };
      
      setGame(newGame);
    }
  }, [isHost]);

  // Listen for P2P messages
  useEffect(() => {
    const unsub = p2pService.subscribe((data, peerId) => {
      if (data.type === 'join') {
        // Host: Add player
        if (isHost && game) {
          const updated = {
            ...game,
            players: [...game.players, { id: peerId, bet: data.bet }],
          };
          setGame(updated);
          p2pService.send({ type: 'game_state', game: updated });
        }
      } else if (data.type === 'game_state') {
        // Player: Receive game state
        setGame(data.game);
      } else if (data.type === 'move') {
        // Process move
        if (game) {
          const result = revealCell(game, data.row, data.col);
          const updated = { ...result };
          setGame(updated);
          if (isHost) p2pService.send({ type: 'game_state', game: updated });
        }
      } else if (data.type === 'chat') {
        setChat(prev => [...prev, { id: peerId, msg: data.msg }]);
        sounds.click();
      }
    });
    return unsub;
  }, [game, isHost]);

  // Player: Send join request
  useEffect(() => {
    if (!isHost && !ready) {
      p2pService.send({ type: 'join', bet });
      setReady(true);
    }
  }, [isHost, ready, bet]);

  const handleMove = (row: number, col: number) => {
    if (!game || game.gameOver || game.revealed[row][col]) return;
    
    const myIndex = game.players.findIndex(p => p.id === myId);
    if (game.currentTurn !== myIndex) return;

    p2pService.send({ type: 'move', row, col });
    sounds.flip();
    haptics.light();
  };

  const handleSendChat = () => {
    if (chatInput.trim()) {
      p2pService.send({ type: 'chat', msg: chatInput.trim() });
      setChat(prev => [...prev, { id: myId, msg: chatInput.trim() }]);
      setChatInput('');
    }
  };

  if (!game) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  const myPlayer = game.players.find(p => p.id === myId);
  const isMyTurn = game.players[game.currentTurn]?.id === myId;

  return (
    <div className="h-full flex flex-col" style={{ paddingTop: 72, paddingBottom: 20 }}>
      <div className="px-5 py-4 flex items-center justify-between">
        <button onClick={onBack} className="text-white/60 text-sm">← Back</button>
        <div className="text-white font-bold text-sm">Minesweeper</div>
        <button onClick={() => setShowChat(!showChat)} className="text-white/60 text-sm">💬</button>
      </div>

      {/* Status */}
      <div className="px-5 mb-4">
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex justify-between mb-2">
            <span className="text-white/60 text-xs">Multiplier</span>
            <span className="text-white font-black text-xl">{game.multiplier.toFixed(2)}x</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60 text-xs">Your Bet</span>
            <span className="text-white font-bold">${myPlayer?.bet || 0}</span>
          </div>
          {!game.gameOver && (
            <div className="mt-2 pt-2 text-white/60 text-xs" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              {isMyTurn ? '🟢 Your turn!' : '⏳ Waiting...'}
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
                disabled={!isMyTurn || game.revealed[i][j]}
                whileTap={{ scale: 0.95 }}
                className="aspect-square rounded-lg font-bold text-sm flex items-center justify-center"
                style={{
                  background: game.revealed[i][j]
                    ? cell.isMine ? '#ef4444' : cell.adjacentMines === 0 ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.12)'
                    : 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  cursor: isMyTurn && !game.revealed[i][j] ? 'pointer' : 'default',
                }}
              >
                {game.revealed[i][j] && (cell.isMine ? '💣' : cell.adjacentMines || '')}
              </motion.button>
            ))
          )}
        </div>
      </div>

      {/* Chat */}
      {showChat && (
        <div className="absolute inset-0 flex flex-col" style={{ background: '#000', zIndex: 100 }}>
          <div className="px-5 py-4 flex justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <span className="text-white font-bold">Chat</span>
            <button onClick={() => setShowChat(false)} className="text-white/60">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
            {chat.map((c, i) => (
              <div key={i} className={c.id === myId ? 'text-right' : ''}>
                <div className="inline-block px-4 py-2 rounded-2xl text-sm" style={{
                  background: c.id === myId ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)',
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
        </div>
      )}
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
