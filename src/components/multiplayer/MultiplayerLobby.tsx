// ═══════════════════════════════════════════════════════════
// Multiplayer Lobby - Create/Join Games
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { multiplayerService } from '../../services/multiplayerService';
import { GameSession, User, WSResponse } from '../../types/multiplayer';
import { sounds, haptics, getState } from '../../store/gameStore';
import MinesweeperGame from './MinesweeperGame';

export default function MultiplayerLobby() {
  const [view, setView] = useState<'lobby' | 'create' | 'game'>('lobby');
  const [games, setGames] = useState<GameSession[]>([]);
  const [currentGame, setCurrentGame] = useState<GameSession | null>(null);
  const [friends, setFriends] = useState<User[]>([]);
  
  // Create game form
  const [mode, setMode] = useState<'duo' | 'trio'>('duo');
  const [bet, setBet] = useState(100);
  const [gridSize, setGridSize] = useState(5);
  const [mineCount, setMineCount] = useState(6);

  const balance = getState().balance;

  useEffect(() => {
    multiplayerService.getAvailableGames();
    multiplayerService.getFriends();

    const unsub = multiplayerService.subscribe((msg: WSResponse) => {
      if (msg.type === 'games_list') {
        setGames(msg.games);
      } else if (msg.type === 'game_created') {
        setCurrentGame(msg.game);
        setView('game');
      } else if (msg.type === 'game_joined' || msg.type === 'game_updated') {
        setCurrentGame(msg.game);
      } else if (msg.type === 'game_started') {
        setCurrentGame(msg.game);
        sounds.woohoo();
        haptics.win();
      } else if (msg.type === 'game_invite') {
        // Show notification
        if (window.confirm(`${msg.from.username} invited you to play! Join?`)) {
          multiplayerService.joinGame(msg.game.id, bet);
          setCurrentGame(msg.game);
          setView('game');
        }
      } else if (msg.type === 'friends_list') {
        setFriends(msg.friends);
      }
    });

    return unsub;
  }, [bet]);

  const handleCreateGame = () => {
    if (balance < bet) {
      alert('Insufficient balance!');
      return;
    }
    multiplayerService.createGame(mode, bet, gridSize, mineCount);
    sounds.click();
    haptics.medium();
  };

  const handleJoinGame = (gameId: string) => {
    if (balance < bet) {
      alert('Insufficient balance!');
      return;
    }
    multiplayerService.joinGame(gameId, bet);
    const game = games.find(g => g.id === gameId);
    if (game) setCurrentGame(game);
    setView('game');
    sounds.click();
    haptics.light();
  };

  const handleBack = () => {
    setView('lobby');
    setCurrentGame(null);
    multiplayerService.getAvailableGames();
  };

  if (view === 'game' && currentGame) {
    return <MinesweeperGame game={currentGame} onBack={handleBack} />;
  }

  if (view === 'create') {
    return (
      <div className="h-full overflow-y-auto" style={{ paddingTop: 72, paddingBottom: 100 }}>
        <div className="px-5 pt-4 pb-6">
          <button
            onClick={() => setView('lobby')}
            className="text-white/60 text-sm mb-4"
          >
            ← Back
          </button>
          <div className="text-white font-black text-2xl">Create Game</div>
          <div className="text-white/40 text-sm">Set up your minesweeper match</div>
        </div>

        <div className="px-5 space-y-4 pb-8">
          <div
            className="rounded-3xl p-5"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {/* Mode */}
            <div className="mb-4">
              <div className="text-white/60 text-xs mb-2">Game Mode</div>
              <div className="flex gap-2">
                {(['duo', 'trio'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className="flex-1 py-2 rounded-xl font-bold text-sm"
                    style={{
                      background: mode === m ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${mode === m ? '#22c55e' : 'rgba(255,255,255,0.1)'}`,
                      color: mode === m ? '#22c55e' : '#fff',
                    }}
                  >
                    {m === 'duo' ? '2 Players' : '3 Players'}
                  </button>
                ))}
              </div>
            </div>

            {/* Bet */}
            <div className="mb-4">
              <div className="text-white/60 text-xs mb-2">Bet Amount (Balance: ${balance})</div>
              <input
                type="number"
                value={bet}
                onChange={(e) => setBet(Math.max(10, parseInt(e.target.value) || 10))}
                className="w-full px-4 py-2 rounded-xl text-white font-bold"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              />
            </div>

            {/* Grid Size */}
            <div className="mb-4">
              <div className="text-white/60 text-xs mb-2">Grid Size</div>
              <div className="flex gap-2">
                {[5, 8, 10].map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      setGridSize(size);
                      setMineCount(Math.floor(size * size * 0.2));
                    }}
                    className="flex-1 py-2 rounded-xl font-bold text-sm"
                    style={{
                      background: gridSize === size ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${gridSize === size ? '#22c55e' : 'rgba(255,255,255,0.1)'}`,
                      color: gridSize === size ? '#22c55e' : '#fff',
                    }}
                  >
                    {size}x{size}
                  </button>
                ))}
              </div>
            </div>

            {/* Mine Count */}
            <div className="mb-4">
              <div className="text-white/60 text-xs mb-2">Mines: {mineCount}</div>
              <input
                type="range"
                min={Math.floor(gridSize * gridSize * 0.1)}
                max={Math.floor(gridSize * gridSize * 0.4)}
                value={mineCount}
                onChange={(e) => setMineCount(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <button
              onClick={handleCreateGame}
              className="w-full py-3 rounded-2xl font-bold"
              style={{
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: '#fff',
              }}
            >
              Create Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto" style={{ paddingTop: 72, paddingBottom: 100 }}>
      <div className="px-5 pt-4 pb-6">
        <div className="text-white font-black text-2xl">Multiplayer</div>
        <div className="text-white/40 text-sm">Team up and play minesweeper</div>
      </div>

      <div className="px-5 space-y-4 pb-8">
        <button
          onClick={() => setView('create')}
          className="w-full py-4 rounded-2xl font-bold"
          style={{
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            color: '#fff',
          }}
        >
          + Create New Game
        </button>

        {/* Available Games */}
        <div
          className="rounded-3xl p-5"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="text-white font-bold mb-3">Available Games</div>
          {games.length === 0 ? (
            <div className="text-white/40 text-sm text-center py-8">
              No games available. Create one!
            </div>
          ) : (
            <div className="space-y-2">
              {games.map((game) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-white font-bold text-sm">
                      {game.mode === 'duo' ? '2' : '3'} Players • {game.state.gridSize}x{game.state.gridSize}
                    </div>
                    <div className="text-white/60 text-xs">
                      {game.players.length}/{game.mode === 'duo' ? 2 : 3}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-white/40 text-xs">
                      Host: {game.players[0].username}
                    </div>
                    <button
                      onClick={() => handleJoinGame(game.id)}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold"
                      style={{ background: '#22c55e', color: '#fff' }}
                    >
                      Join
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
