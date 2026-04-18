// ═══════════════════════════════════════════════════════════
// Team Minesweeper Game Component
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { multiplayerService } from '../../services/multiplayerService';
import { GameSession, ChatMessage, WSResponse, User } from '../../types/multiplayer';
import { sounds, haptics, formatCurrency } from '../../store/gameStore';

interface Props {
  game: GameSession;
  onBack: () => void;
}

export default function MinesweeperGame({ game: initialGame, onBack }: Props) {
  const [game, setGame] = useState(initialGame);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [friends, setFriends] = useState<User[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const currentUserId = localStorage.getItem('userId') || '';
  const isMyTurn = game.status === 'active' && game.players[game.state.currentTurn]?.userId === currentUserId;
  const myPlayer = game.players.find(p => p.userId === currentUserId);

  useEffect(() => {
    multiplayerService.getFriends();

    const unsub = multiplayerService.subscribe((msg: WSResponse) => {
      if (msg.type === 'game_joined' || msg.type === 'game_updated' || msg.type === 'game_started') {
        setGame(msg.game);
      } else if (msg.type === 'turn_result') {
        setGame(msg.game);
        if (msg.action.result === 'safe') {
          sounds.coin();
          haptics.light();
        }
      } else if (msg.type === 'game_over') {
        setGame(msg.game);
        if (msg.game.state.winner) {
          sounds.bigWin();
          haptics.win();
        } else {
          sounds.lose();
          haptics.lose();
        }
      } else if (msg.type === 'chat_message') {
        setChatMessages(prev => [...prev, msg.message]);
        sounds.click();
      } else if (msg.type === 'friends_list') {
        setFriends(msg.friends);
      }
    });

    return unsub;
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleReady = () => {
    multiplayerService.ready(game.id);
    sounds.click();
    haptics.medium();
  };

  const handleCellClick = (row: number, col: number) => {
    if (!isMyTurn || game.state.revealed[row][col]) return;
    multiplayerService.makeMove(game.id, row, col);
    sounds.flip();
    haptics.light();
  };

  const handleCashout = () => {
    if (window.confirm('Cash out now? All players will receive their share.')) {
      multiplayerService.cashout(game.id);
      sounds.reward();
      haptics.medium();
    }
  };

  const handleSendChat = () => {
    if (chatInput.trim()) {
      multiplayerService.sendChat(game.id, chatInput.trim());
      setChatInput('');
    }
  };

  const handleInviteFriend = (friendId: string) => {
    multiplayerService.inviteFriend(friendId, game.id);
    setShowInvite(false);
    sounds.coin();
    haptics.light();
  };

  const getCellColor = (row: number, col: number) => {
    if (!game.state.revealed[row][col]) return 'rgba(255,255,255,0.08)';
    const cell = game.state.grid[row][col];
    if (cell.isMine) return '#ef4444';
    if (cell.adjacentMines === 0) return 'rgba(34,197,94,0.2)';
    return 'rgba(255,255,255,0.12)';
  };

  const getCellText = (row: number, col: number) => {
    if (!game.state.revealed[row][col]) return '';
    const cell = game.state.grid[row][col];
    if (cell.isMine) return '💣';
    if (cell.adjacentMines === 0) return '';
    return cell.adjacentMines.toString();
  };

  return (
    <div className="h-full flex flex-col" style={{ paddingTop: 72, paddingBottom: 20 }}>
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between">
        <button onClick={onBack} className="text-white/60 text-sm">
          ← Back
        </button>
        <div className="text-white font-bold text-sm">
          {game.mode === 'duo' ? '2' : '3'} Player Minesweeper
        </div>
        <button
          onClick={() => setShowChat(!showChat)}
          className="text-white/60 text-sm relative"
        >
          💬 {chatMessages.length > 0 && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />}
        </button>
      </div>

      {/* Game Status */}
      <div className="px-5 mb-4">
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-white/60 text-xs">Multiplier</div>
            <div className="text-white font-black text-xl">{game.state.multiplier.toFixed(2)}x</div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-white/60 text-xs">Your Bet</div>
            <div className="text-white font-bold">${myPlayer?.bet || 0}</div>
          </div>
          {game.status === 'active' && (
            <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="text-white/60 text-xs mb-1">Current Turn</div>
              <div className="text-white font-bold text-sm">
                {game.players[game.state.currentTurn]?.username}
                {isMyTurn && ' (You!)'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Players */}
      <div className="px-5 mb-4">
        <div className="flex gap-2">
          {game.players.map((player, idx) => (
            <div
              key={player.userId}
              className="flex-1 p-3 rounded-xl"
              style={{
                background: game.state.currentTurn === idx && game.status === 'active'
                  ? 'rgba(34,197,94,0.2)'
                  : 'rgba(255,255,255,0.05)',
                border: `1px solid ${game.state.currentTurn === idx && game.status === 'active' ? '#22c55e' : 'rgba(255,255,255,0.1)'}`,
              }}
            >
              <div className="text-white font-bold text-xs">{player.username}</div>
              <div className="text-white/60 text-xs">${player.bet}</div>
              {game.status === 'waiting' && (
                <div className="text-xs mt-1" style={{ color: player.ready ? '#22c55e' : '#fbbf24' }}>
                  {player.ready ? '✓ Ready' : 'Waiting...'}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Waiting Room */}
      {game.status === 'waiting' && (
        <div className="px-5 mb-4">
          <div
            className="rounded-2xl p-4 text-center"
            style={{
              background: 'rgba(255,215,0,0.08)',
              border: '1px solid rgba(255,215,0,0.2)',
            }}
          >
            <div className="text-white font-bold mb-2">Waiting for players...</div>
            <div className="text-white/60 text-sm mb-3">
              {game.players.length}/{game.mode === 'duo' ? 2 : 3} players
            </div>
            {!myPlayer?.ready && (
              <button
                onClick={handleReady}
                className="px-6 py-2 rounded-xl font-bold text-sm"
                style={{ background: '#22c55e', color: '#fff' }}
              >
                Ready
              </button>
            )}
            {game.players.length < (game.mode === 'duo' ? 2 : 3) && (
              <button
                onClick={() => setShowInvite(true)}
                className="ml-2 px-6 py-2 rounded-xl font-bold text-sm"
                style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}
              >
                Invite Friend
              </button>
            )}
          </div>
        </div>
      )}

      {/* Minesweeper Grid */}
      {game.status === 'active' && (
        <div className="flex-1 px-5 overflow-auto">
          <div
            className="grid gap-1 mx-auto"
            style={{
              gridTemplateColumns: `repeat(${game.state.gridSize}, 1fr)`,
              maxWidth: 400,
            }}
          >
            {game.state.grid.map((row, i) =>
              row.map((_, j) => (
                <motion.button
                  key={`${i}-${j}`}
                  onClick={() => handleCellClick(i, j)}
                  disabled={!isMyTurn || game.state.revealed[i][j]}
                  whileTap={{ scale: 0.95 }}
                  className="aspect-square rounded-lg font-bold text-sm flex items-center justify-center"
                  style={{
                    background: getCellColor(i, j),
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    cursor: isMyTurn && !game.state.revealed[i][j] ? 'pointer' : 'default',
                  }}
                >
                  {getCellText(i, j)}
                </motion.button>
              ))
            )}
          </div>

          {/* Cashout Button */}
          {!game.state.gameOver && game.state.multiplier > 1 && (
            <div className="mt-4">
              <button
                onClick={handleCashout}
                className="w-full py-3 rounded-2xl font-bold"
                style={{
                  background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                  color: '#000',
                }}
              >
                💰 Cash Out ({formatCurrency(myPlayer!.bet * game.state.multiplier)})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Game Over */}
      {game.state.gameOver && (
        <div className="px-5 mb-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-2xl p-6 text-center"
            style={{
              background: game.state.winner
                ? 'rgba(34,197,94,0.2)'
                : 'rgba(239,68,68,0.2)',
              border: `1px solid ${game.state.winner ? '#22c55e' : '#ef4444'}`,
            }}
          >
            <div className="text-4xl mb-2">{game.state.winner ? '🎉' : '💥'}</div>
            <div className="text-white font-black text-xl mb-2">
              {game.state.winner ? 'Victory!' : 'Game Over'}
            </div>
            <div className="text-white/80 text-sm">
              {game.state.winner
                ? `You won ${formatCurrency(myPlayer!.bet * game.state.multiplier)}!`
                : 'Hit a mine! Better luck next time.'}
            </div>
          </motion.div>
        </div>
      )}

      {/* Chat Overlay */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="absolute inset-0 flex flex-col"
            style={{ background: '#000', zIndex: 100 }}
          >
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="text-white font-bold">Chat</div>
              <button onClick={() => setShowChat(false)} className="text-white/60">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={msg.userId === currentUserId ? 'text-right' : ''}>
                  <div className="text-white/60 text-xs mb-1">{msg.username}</div>
                  <div
                    className="inline-block px-4 py-2 rounded-2xl text-sm"
                    style={{
                      background: msg.userId === currentUserId
                        ? 'rgba(34,197,94,0.2)'
                        : 'rgba(255,255,255,0.08)',
                      color: '#fff',
                    }}
                  >
                    {msg.message}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="px-5 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 rounded-xl text-white text-sm"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                />
                <button
                  onClick={handleSendChat}
                  className="px-6 py-2 rounded-xl font-bold text-sm"
                  style={{ background: '#22c55e', color: '#fff' }}
                >
                  Send
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invite Friends Modal */}
      <AnimatePresence>
        {showInvite && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.8)', zIndex: 100 }}
            onClick={() => setShowInvite(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="mx-5 rounded-3xl p-6"
              style={{
                background: '#000',
                border: '1px solid rgba(255,255,255,0.2)',
                maxWidth: 400,
                width: '100%',
              }}
            >
              <div className="text-white font-bold text-lg mb-4">Invite Friends</div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {friends.map((friend) => (
                  <button
                    key={friend.id}
                    onClick={() => handleInviteFriend(friend.id)}
                    className="w-full p-3 rounded-xl text-left"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <div className="text-white font-bold text-sm">{friend.username}</div>
                    <div className="text-white/40 text-xs">{friend.id}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
