// ═══════════════════════════════════════════════════════════
// Dopamine Box Multiplayer Server
// ═══════════════════════════════════════════════════════════

import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import {
  User,
  GameSession,
  WSMessage,
  WSResponse,
  ChatMessage,
  TurnAction,
} from './types.js';
import { createMinesweeperGame, revealCell, checkWinCondition, calculatePayout } from './gameLogic.js';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

// In-memory storage (replace with database in production)
const users = new Map<string, User>();
const games = new Map<string, GameSession>();
const connections = new Map<string, WebSocket>(); // userId -> WebSocket
const chatHistory = new Map<string, ChatMessage[]>(); // gameId -> messages

// Helper to send message to user
function sendToUser(userId: string, message: WSResponse) {
  const ws = connections.get(userId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

// Helper to broadcast to all players in a game
function broadcastToGame(gameId: string, message: WSResponse) {
  const game = games.get(gameId);
  if (game) {
    game.players.forEach(p => sendToUser(p.userId, message));
  }
}

// WebSocket connection handler
wss.on('connection', (ws: WebSocket) => {
  let currentUserId: string | null = null;

  ws.on('message', (data: Buffer) => {
    try {
      const msg: WSMessage = JSON.parse(data.toString());

      switch (msg.type) {
        case 'auth': {
          // Simple auth - create or get user
          let user = users.get(msg.userId);
          if (!user) {
            user = {
              id: msg.userId,
              username: msg.username,
              balance: 1000,
              friends: [],
              friendRequests: [],
            };
            users.set(msg.userId, user);
          }
          currentUserId = msg.userId;
          connections.set(msg.userId, ws);
          sendToUser(msg.userId, { type: 'auth_success', user });
          break;
        }

        case 'get_friends': {
          if (!currentUserId) return;
          const user = users.get(currentUserId);
          if (!user) return;
          
          const friends = user.friends.map(id => users.get(id)!).filter(Boolean);
          const requests = user.friendRequests.map(id => users.get(id)!).filter(Boolean);
          sendToUser(currentUserId, { type: 'friends_list', friends, requests });
          break;
        }

        case 'friend_request': {
          if (!currentUserId) return;
          const targetUser = users.get(msg.targetUserId);
          const requester = users.get(currentUserId);
          if (!targetUser || !requester) {
            sendToUser(currentUserId, { type: 'error', message: 'User not found' });
            return;
          }
          if (!targetUser.friendRequests.includes(currentUserId)) {
            targetUser.friendRequests.push(currentUserId);
            sendToUser(msg.targetUserId, { type: 'friend_request_received', from: requester });
          }
          break;
        }

        case 'friend_accept': {
          if (!currentUserId) return;
          const user = users.get(currentUserId);
          const requester = users.get(msg.requesterId);
          if (!user || !requester) return;

          user.friendRequests = user.friendRequests.filter(id => id !== msg.requesterId);
          if (!user.friends.includes(msg.requesterId)) {
            user.friends.push(msg.requesterId);
            requester.friends.push(currentUserId);
            sendToUser(currentUserId, { type: 'friend_added', friend: requester });
            sendToUser(msg.requesterId, { type: 'friend_added', friend: user });
          }
          break;
        }

        case 'friend_reject': {
          if (!currentUserId) return;
          const user = users.get(currentUserId);
          if (!user) return;
          user.friendRequests = user.friendRequests.filter(id => id !== msg.requesterId);
          break;
        }

        case 'create_game': {
          if (!currentUserId) return;
          const user = users.get(currentUserId);
          if (!user || user.balance < msg.bet) {
            sendToUser(currentUserId, { type: 'error', message: 'Insufficient balance' });
            return;
          }

          const game: GameSession = {
            id: uuidv4(),
            type: 'minesweeper',
            mode: msg.mode,
            players: [{
              userId: currentUserId,
              username: user.username,
              bet: msg.bet,
              ready: false,
            }],
            state: createMinesweeperGame(msg.gridSize, msg.mineCount),
            createdAt: Date.now(),
            status: 'waiting',
          };

          games.set(game.id, game);
          chatHistory.set(game.id, []);
          sendToUser(currentUserId, { type: 'game_created', game });
          break;
        }

        case 'invite_friend': {
          if (!currentUserId) return;
          const game = games.get(msg.gameId);
          const user = users.get(currentUserId);
          if (!game || !user) return;

          sendToUser(msg.friendId, { type: 'game_invite', game, from: user });
          break;
        }

        case 'join_game': {
          if (!currentUserId) return;
          const game = games.get(msg.gameId);
          const user = users.get(currentUserId);
          if (!game || !user) return;

          if (user.balance < msg.bet) {
            sendToUser(currentUserId, { type: 'error', message: 'Insufficient balance' });
            return;
          }

          const maxPlayers = game.mode === 'duo' ? 2 : 3;
          if (game.players.length >= maxPlayers) {
            sendToUser(currentUserId, { type: 'error', message: 'Game is full' });
            return;
          }

          game.players.push({
            userId: currentUserId,
            username: user.username,
            bet: msg.bet,
            ready: false,
          });

          broadcastToGame(msg.gameId, { type: 'game_joined', game });
          break;
        }

        case 'ready': {
          if (!currentUserId) return;
          const game = games.get(msg.gameId);
          if (!game) return;

          const player = game.players.find(p => p.userId === currentUserId);
          if (player) {
            player.ready = true;
            
            // Deduct bet from balance
            const user = users.get(currentUserId);
            if (user) user.balance -= player.bet;

            // Check if all players are ready
            if (game.players.every(p => p.ready)) {
              game.status = 'active';
              broadcastToGame(msg.gameId, { type: 'game_started', game });
            } else {
              broadcastToGame(msg.gameId, { type: 'game_updated', game });
            }
          }
          break;
        }

        case 'make_move': {
          if (!currentUserId) return;
          const game = games.get(msg.gameId);
          if (!game || game.status !== 'active' || game.state.gameOver) return;

          const currentPlayer = game.players[game.state.currentTurn];
          if (currentPlayer.userId !== currentUserId) {
            sendToUser(currentUserId, { type: 'error', message: 'Not your turn' });
            return;
          }

          const result = revealCell(game.state, msg.row, msg.col);
          if (!result.success) {
            sendToUser(currentUserId, { type: 'error', message: 'Cell already revealed' });
            return;
          }

          const action: TurnAction = {
            playerId: currentUserId,
            row: msg.row,
            col: msg.col,
            timestamp: Date.now(),
            result: result.hitMine ? 'mine' : 'safe',
          };

          game.state.turnHistory.push(action);
          game.state.multiplier = result.newMultiplier;

          if (result.hitMine) {
            // Game over - everyone loses
            game.state.gameOver = true;
            game.state.winner = false;
            game.status = 'completed';
            broadcastToGame(msg.gameId, { type: 'game_over', game, payouts: [] });
          } else if (checkWinCondition(game.state)) {
            // Game won - distribute payouts
            game.state.gameOver = true;
            game.state.winner = true;
            game.status = 'completed';

            const payouts = game.players.map(p => {
              const payout = calculatePayout(p.bet, game.state.multiplier);
              const user = users.get(p.userId);
              if (user) user.balance += payout;
              return { userId: p.userId, amount: payout };
            });

            broadcastToGame(msg.gameId, { type: 'game_over', game, payouts });
          } else {
            // Next turn
            game.state.currentTurn = (game.state.currentTurn + 1) % game.players.length;
            broadcastToGame(msg.gameId, { type: 'turn_result', game, action });
          }
          break;
        }

        case 'cashout': {
          if (!currentUserId) return;
          const game = games.get(msg.gameId);
          if (!game || game.status !== 'active' || game.state.gameOver) return;

          // All players must agree to cashout (simplified - instant cashout)
          game.state.gameOver = true;
          game.state.winner = true;
          game.status = 'completed';

          const payouts = game.players.map(p => {
            const payout = calculatePayout(p.bet, game.state.multiplier);
            const user = users.get(p.userId);
            if (user) user.balance += payout;
            return { userId: p.userId, amount: payout };
          });

          broadcastToGame(msg.gameId, { type: 'game_over', game, payouts });
          break;
        }

        case 'chat': {
          if (!currentUserId) return;
          const user = users.get(currentUserId);
          if (!user) return;

          const chatMsg: ChatMessage = {
            id: uuidv4(),
            gameId: msg.gameId,
            userId: currentUserId,
            username: user.username,
            message: msg.message,
            timestamp: Date.now(),
          };

          const history = chatHistory.get(msg.gameId);
          if (history) history.push(chatMsg);

          broadcastToGame(msg.gameId, { type: 'chat_message', message: chatMsg });
          break;
        }

        case 'get_games': {
          if (!currentUserId) return;
          const availableGames = Array.from(games.values()).filter(g => g.status === 'waiting');
          sendToUser(currentUserId, { type: 'games_list', games: availableGames });
          break;
        }
      }
    } catch (error) {
      console.error('WebSocket error:', error);
    }
  });

  ws.on('close', () => {
    if (currentUserId) {
      connections.delete(currentUserId);
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', users: users.size, games: games.size });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🎮 Dopamine Box Server running on port ${PORT}`);
});
