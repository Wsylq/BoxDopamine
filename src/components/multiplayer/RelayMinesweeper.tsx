// ═══════════════════════════════════════════════════════════
// Relay Minesweeper Game (Simple WebSocket Relay)
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
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

interface GameState {
  grid: { isMine: boolean; adjacentMines: number }[][];
  revealed: boolean[][];
  currentTurn: number;
  multiplier: number;
  gameOver: boolean;
  winner: boolean;
  players: Player[];
  started: boolean;
  cashoutVote?: {
    initiator: string;
    votes: { [playerId: string]: boolean }; // true = yes, false = no
    active: boolean;
  };
}

export default function RelayMinesweeper({ isHost, onBack }: Props) {
  const [game, setGame] = useState<GameState | null>(null);
  const [bet, setBet] = useState(100);
  const [myReady, setMyReady] = useState(false);
  const [chat, setChat] = useState<{ username: string; msg: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [connected, setConnected] = useState(false);
  const [hasInitiatedCashout, setHasInitiatedCashout] = useState(false);

  const balance = getState().balance;
  const myId = relayService.myId;
  const myUsername = relayService.getUsername();

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
      setConnected(true); // Host is always connected
    }
  }, [isHost]);

  // Listen for relay messages
  useEffect(() => {
    // Listen for connection status changes
    const unsubStatus = relayService.onStatus((isConnected) => {
      setConnected(isConnected);
    });

    const unsub = relayService.subscribe((data, fromId) => {
      console.log('🎮 Game received:', data?.type, 'from:', fromId, 'data:', data);

      // Server confirmed we joined the room
      if (data.type === 'joined') {
        console.log('✅ Joined room, setting connected=true');
        setConnected(true);
        if (!isHost) {
          console.log('📤 Player requesting game state from host');
          setTimeout(() => relayService.send({ type: 'request_state' }), 300);
        }
        return;
      }

      // Another player joined
      if (data.type === 'player_joined') {
        console.log('👤 Player joined:', data.username);
        setConnected(true);
        if (isHost && game && data.userId !== myId) {
          console.log('📤 Host adding player and broadcasting state');
          const updated = {
            ...game,
            players: [
              ...game.players,
              { id: data.userId, username: data.username, bet: 0, ready: false },
            ],
          };
          setGame(updated);
          setTimeout(() => {
            console.log('📤 Host sending game_state:', updated);
            relayService.send({ type: 'game_state', game: updated });
          }, 100);
        }
        return;
      }

      // Host: Player requesting game state
      if (data.type === 'request_state') {
        console.log('📥 Host received request_state');
        if (isHost && game) {
          console.log('📤 Host sending game_state:', game);
          relayService.send({ type: 'game_state', game });
        }
        return;
      }

      // Receive game state from host
      if (data.type === 'game_state') {
        console.log('📥 Received game_state:', data.game);
        setGame(data.game);
        setConnected(true);
        return;
      }

      // Player set their bet
      if (data.type === 'bet_set') {
        if (game) {
          const updated = {
            ...game,
            players: game.players.map(p => 
              p.id === data.playerId ? { ...p, bet: data.bet } : p
            ),
          };
          setGame(updated);
          if (isHost) relayService.send({ type: 'game_state', game: updated });
        }
        return;
      }

      // Player marked ready
      if (data.type === 'ready') {
        console.log('📥 Player ready:', data.playerId);
        if (game) {
          const updated = {
            ...game,
            players: game.players.map(p => 
              p.id === data.playerId ? { ...p, ready: true } : p
            ),
          };
          setGame(updated);
          
          console.log('Players ready status:', updated.players.map(p => ({ name: p.username, ready: p.ready })));
          
          // Host: Check if all ready, start game
          if (isHost && updated.players.every(p => p.ready)) {
            console.log('🎮 All players ready! Starting game...');
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
            console.log('📤 Broadcasting game start');
            relayService.send({ type: 'game_state', game: started });
          } else if (isHost) {
            console.log('⏳ Waiting for more players to ready up');
            relayService.send({ type: 'game_state', game: updated });
          }
        }
        return;
      }

      // Player made a move
      if (data.type === 'move') {
        console.log('📥 Received move:', data.row, data.col);
        if (game && isHost) {
          console.log('🎮 Host processing move');
          const result = revealCell(game, data.row, data.col);
          setGame(result);
          console.log('📤 Host broadcasting updated game state');
          relayService.send({ type: 'game_state', game: result });
          
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
        } else {
          console.log('⚠️ Non-host received move, ignoring');
        }
        return;
      }

      // Chat message
      if (data.type === 'chat') {
        setChat(prev => [...prev, { username: data.username, msg: data.msg }]);
        sounds.click();
        return;
      }

      // Cashout vote initiated
      if (data.type === 'initiate_cashout') {
        console.log('💰 Cashout vote initiated by:', data.initiator);
        if (game && isHost) {
          const updated = {
            ...game,
            cashoutVote: {
              initiator: data.initiator,
              votes: {},
              active: true,
            },
          };
          setGame(updated);
          relayService.send({ type: 'game_state', game: updated });
        }
        return;
      }

      // Cashout vote response
      if (data.type === 'cashout_vote') {
        console.log('🗳️ Cashout vote from:', data.playerId, 'vote:', data.vote);
        if (game && isHost && game.cashoutVote) {
          const updated = {
            ...game,
            cashoutVote: {
              ...game.cashoutVote,
              votes: {
                ...game.cashoutVote.votes,
                [data.playerId]: data.vote,
              },
            },
          };

          // Check if all players voted
          const allVoted = game.players.every(p => p.id in updated.cashoutVote!.votes);
          if (allVoted) {
            const allYes = Object.values(updated.cashoutVote.votes).every(v => v === true);
            if (allYes) {
              // Cashout approved - end game as winner
              console.log('✅ Cashout approved!');
              const cashedOut = {
                ...updated,
                gameOver: true,
                winner: true,
                cashoutVote: undefined,
              };
              setGame(cashedOut);
              relayService.send({ type: 'game_state', game: cashedOut });
              
              // Payout
              setTimeout(() => {
                cashedOut.players.forEach(p => {
                  const payout = Math.floor(p.bet * cashedOut.multiplier);
                  if (p.id === myId) addBalance(payout);
                });
              }, 500);
            } else {
              // Cashout rejected - continue game
              console.log('❌ Cashout rejected');
              const rejected = { ...updated, cashoutVote: undefined };
              setGame(rejected);
              relayService.send({ type: 'game_state', game: rejected });
            }
          } else {
            setGame(updated);
            relayService.send({ type: 'game_state', game: updated });
          }
        }
        return;
      }
    });

    return () => {
      unsubStatus();
      unsub();
    };
  }, [game, isHost, myId]);


  // Player: Request initial game state
  useEffect(() => {
    if (!isHost && !game && connected) {
      // Request game state from host
      setTimeout(() => {
        relayService.send({ type: 'request_state' });
      }, 500);
    }
  }, [isHost, game, connected]);

  const handleSetBet = () => {
    if (bet < 10 || bet > balance) {
      alert('Invalid bet amount!');
      return;
    }
    
    relayService.send({ type: 'bet_set', playerId: myId, bet });
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
    console.log('🎯 Ready button clicked, isHost:', isHost);
    if (!game) {
      console.log('❌ No game state');
      return;
    }
    const myPlayer = game.players.find(p => p.id === myId);
    console.log('My player:', myPlayer);
    
    if (!myPlayer || myPlayer.bet === 0) {
      alert('Set your bet first!');
      return;
    }
    
    console.log('💰 Deducting bet:', myPlayer.bet);
    addBalance(-myPlayer.bet);
    setMyReady(true);
    
    console.log('📤 Sending ready message');
    relayService.send({ type: 'ready', playerId: myId });
    
    const updated = {
      ...game,
      players: game.players.map(p => 
        p.id === myId ? { ...p, ready: true } : p
      ),
    };
    setGame(updated);
    console.log('✅ Local state updated, marked as ready');
    console.log('Players ready status:', updated.players.map(p => ({ name: p.username, ready: p.ready })));
    
    // Host: Check if all ready after updating local state
    if (isHost && updated.players.every(p => p.ready)) {
      console.log('🎮 All players ready! Starting game...');
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
      console.log('📤 Broadcasting game start');
      relayService.send({ type: 'game_state', game: started });
    }
    
    sounds.reward();
    haptics.medium();
  };

  const handleMove = (row: number, col: number) => {
    if (!game || !game.started || game.gameOver || game.revealed[row][col]) {
      console.log('❌ Move blocked:', { started: game?.started, gameOver: game?.gameOver, revealed: game?.revealed[row][col] });
      return;
    }
    
    const myIndex = game.players.findIndex(p => p.id === myId);
    console.log('🎯 Attempting move:', { row, col, myIndex, currentTurn: game.currentTurn, isMyTurn: game.currentTurn === myIndex, isHost, myId });
    
    if (game.currentTurn !== myIndex) {
      console.log('❌ Not your turn!');
      return;
    }

    console.log('📤 Sending move to host, isHost:', isHost);
    relayService.send({ type: 'move', row, col });
    
    // If I'm the host, process it immediately
    if (isHost) {
      console.log('🎮 I am host, processing move locally');
      const result = revealCell(game, row, col);
      setGame(result);
      relayService.send({ type: 'game_state', game: result });
    }
    
    sounds.flip();
    haptics.light();
  };

  const handleSendChat = () => {
    if (chatInput.trim()) {
      relayService.send({ type: 'chat', username: myUsername, msg: chatInput.trim() });
      setChat(prev => [...prev, { username: myUsername, msg: chatInput.trim() }]);
      setChatInput('');
    }
  };

  if (!connected) {
    return (
      <div className="h-full flex items-center justify-center px-5" style={{ background: '#000' }}>
        <div className="text-center max-w-md">
          <div className="text-white text-lg mb-2">Connecting...</div>
          <div className="text-white/60 text-sm mb-4">Room: {relayService.getRoomId()}</div>
          <div className="text-white/40 text-xs space-y-2">
            <div>If stuck here, check:</div>
            <div>• Server is running on port 5038</div>
            <div>• Browser console (F12) for errors</div>
            <div>• HTTPS pages need wss:// not ws://</div>
          </div>
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

  const myPlayer = game.players.find(p => p.id === myId);
  const isMyTurn = game.started && game.players[game.currentTurn]?.id === myId;

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: '#000', zIndex: 1000 }}>
      <div className="px-5 py-4 flex items-center justify-between">
        <button onClick={onBack} className="text-white/60 text-sm">← Back</button>
        <div className="text-white font-bold text-sm">Room: {relayService.getRoomId()}</div>
        <button onClick={() => setShowChat(!showChat)} className="text-white/60 text-sm">💬</button>
      </div>

      {/* Waiting Room */}
      {!game.started && (
        <div className="flex-1 px-5 overflow-y-auto">
          <div className="text-white font-bold text-lg mb-2">Waiting Room</div>
          
          {/* Game Rules */}
          <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)' }}>
            <div className="text-white font-bold text-sm mb-2">🎮 Team Minesweeper</div>
            <div className="text-white/80 text-xs space-y-1">
              <div>• Take turns revealing cells</div>
              <div>• Avoid mines to increase multiplier</div>
              <div>• ⚠️ If ANY player hits a mine, EVERYONE loses!</div>
              <div>• Clear all safe cells to win together</div>
            </div>
          </div>
          
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
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  {!hasInitiatedCashout && !game.cashoutVote && (
                    <button
                      onClick={() => {
                        setHasInitiatedCashout(true);
                        relayService.send({ type: 'initiate_cashout', initiator: myId });
                        sounds.coin();
                        haptics.light();
                      }}
                      className="w-full py-2 rounded-xl font-bold text-sm"
                      style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', color: '#000' }}
                    >
                      💰 Request Cashout
                    </button>
                  )}
                </div>
              )}
              {!game.gameOver && (
                <div className="mt-2 pt-2 text-white/60 text-xs" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  {isMyTurn ? '🟢 Your turn!' : `⏳ ${game.players[game.currentTurn]?.username}'s turn`}
                </div>
              )}
            </div>
          </div>

          {/* Cashout Vote Popup */}
          {game.cashoutVote && game.cashoutVote.active && (
            <div className="absolute inset-0 flex items-center justify-center px-5" style={{ background: 'rgba(0,0,0,0.8)', zIndex: 100 }}>
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="rounded-3xl p-6 max-w-sm w-full"
                style={{
                  background: 'linear-gradient(135deg, rgba(251,191,36,0.2), rgba(245,158,11,0.1))',
                  border: '2px solid #fbbf24',
                  boxShadow: '0 0 30px rgba(251,191,36,0.3)',
                }}
              >
                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">💰</div>
                  <div className="text-white font-black text-xl mb-2">Cashout Vote</div>
                  <div className="text-white/80 text-sm mb-1">
                    {game.players.find(p => p.id === game.cashoutVote?.initiator)?.username} wants to cashout
                  </div>
                  <div className="text-white/60 text-xs">
                    Current win: ${formatCurrency((myPlayer?.bet || 0) * game.multiplier)}
                  </div>
                </div>

                {!(myId in (game.cashoutVote.votes || {})) ? (
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        relayService.send({ type: 'cashout_vote', playerId: myId, vote: false });
                        sounds.click();
                        haptics.light();
                      }}
                      className="flex-1 py-3 rounded-xl font-bold"
                      style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', color: '#ef4444' }}
                    >
                      ❌ No
                    </button>
                    <button
                      onClick={() => {
                        relayService.send({ type: 'cashout_vote', playerId: myId, vote: true });
                        sounds.coin();
                        haptics.medium();
                      }}
                      className="flex-1 py-3 rounded-xl font-bold"
                      style={{ background: '#22c55e', color: '#fff' }}
                    >
                      ✅ Yes
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-white/60 text-sm mb-3">Waiting for other players...</div>
                    <div className="space-y-2">
                      {game.players.map(p => (
                        <div key={p.id} className="flex justify-between items-center text-sm">
                          <span className="text-white/80">{p.username}</span>
                          <span className="text-white/60">
                            {p.id in game.cashoutVote!.votes
                              ? game.cashoutVote!.votes[p.id] ? '✅ Yes' : '❌ No'
                              : '⏳ Voting...'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          )}

          {/* Grid */}
          <div className="flex-1 px-5 overflow-auto">
            <div className="grid gap-2 mx-auto" style={{ gridTemplateColumns: `repeat(${game.grid.length}, 1fr)`, maxWidth: 400 }}>
              {game.grid.map((row, i) =>
                row.map((cell, j) => (
                  <motion.button
                    key={`${i}-${j}`}
                    onClick={() => handleMove(i, j)}
                    disabled={!isMyTurn || game.revealed[i][j] || game.gameOver}
                    whileTap={{ scale: 0.95 }}
                    className="aspect-square rounded-xl flex items-center justify-center relative"
                    style={{
                      background: game.revealed[i][j]
                        ? 'rgba(15,23,42,0.8)' // Same dark background for both
                        : 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      cursor: isMyTurn && !game.revealed[i][j] && !game.gameOver ? 'pointer' : 'default',
                      boxShadow: game.revealed[i][j] 
                        ? cell.isMine 
                          ? '0 0 20px rgba(239,68,68,0.6)' // Red glow for bomb
                          : '0 0 20px rgba(34,197,94,0.5)' // Green glow for gem
                        : 'none',
                    }}
                  >
                    {game.revealed[i][j] && (
                      cell.isMine ? (
                        <img 
                          src="/minesweeper-assets/bomb.png" 
                          alt="bomb" 
                          className="w-full h-full object-contain"
                          style={{ 
                            filter: 'drop-shadow(0 0 10px rgba(255,100,100,0.8))',
                            transform: 'scale(2)' // Change this: 1.3 = 30% bigger, 1.5 = 50% bigger, 2.0 = double size
                          }}
                        />
                      ) : (
                        <img 
                          src="/minesweeper-assets/gem.png" 
                          alt="gem" 
                          className="w-full h-full object-contain p-2"
                          style={{ filter: 'drop-shadow(0 0 12px rgba(34,197,94,0.9))' }}
                        />
                      )
                    )}
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
                  {game.winner ? 'Team Victory!' : 'Team Eliminated!'}
                </div>
                <div className="text-white/80 text-sm">
                  {game.winner
                    ? `Everyone wins! You got ${formatCurrency((myPlayer?.bet || 0) * game.multiplier)}!`
                    : 'A teammate hit a mine! Everyone loses their bet.'}
                </div>
              </motion.div>
            )}
          </div>
        </>
      )}

      {/* Chat - Floating */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="absolute bottom-0 left-0 right-0 flex flex-col"
            style={{ 
              background: 'rgba(0,0,0,0.95)', 
              backdropFilter: 'blur(10px)',
              zIndex: 200,
              maxHeight: '60vh',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              border: '1px solid rgba(255,255,255,0.1)',
              borderBottom: 'none'
            }}
          >
            <div className="px-5 py-3 flex justify-between items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <span className="text-white font-bold text-sm">💬 Chat</span>
              <button onClick={() => setShowChat(false)} className="text-white/60 text-xl">×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
              {chat.length === 0 ? (
                <div className="text-white/40 text-xs text-center py-4">No messages yet</div>
              ) : (
                chat.map((c, i) => (
                  <div key={i} className={c.username === myUsername ? 'text-right' : ''}>
                    <div className="text-white/40 text-xs mb-1">{c.username}</div>
                    <div className="inline-block px-3 py-2 rounded-xl text-sm" style={{
                      background: c.username === myUsername ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)',
                      color: '#fff',
                    }}>
                      {c.msg}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="px-5 py-3 flex gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 rounded-xl text-white text-sm"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
              />
              <button onClick={handleSendChat} className="px-5 py-2 rounded-xl font-bold text-sm" style={{ background: '#22c55e', color: '#fff' }}>
                Send
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper functions (same as before)
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