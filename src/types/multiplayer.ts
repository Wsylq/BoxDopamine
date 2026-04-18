// ═══════════════════════════════════════════════════════════
// Multiplayer Types (Client)
// ═══════════════════════════════════════════════════════════

export interface User {
  id: string;
  username: string;
  balance: number;
  friends: string[];
  friendRequests: string[];
}

export interface GameSession {
  id: string;
  type: 'minesweeper';
  mode: 'duo' | 'trio';
  players: PlayerInGame[];
  state: MinesweeperState;
  createdAt: number;
  status: 'waiting' | 'active' | 'completed';
}

export interface PlayerInGame {
  userId: string;
  username: string;
  bet: number;
  ready: boolean;
}

export interface MinesweeperState {
  gridSize: number;
  mineCount: number;
  grid: CellState[][];
  revealed: boolean[][];
  currentTurn: number;
  turnHistory: TurnAction[];
  multiplier: number;
  gameOver: boolean;
  winner: boolean;
}

export interface CellState {
  isMine: boolean;
  adjacentMines: number;
}

export interface TurnAction {
  playerId: string;
  row: number;
  col: number;
  timestamp: number;
  result: 'safe' | 'mine';
}

export interface ChatMessage {
  id: string;
  gameId: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
}

export type WSMessage =
  | { type: 'auth'; userId: string; username: string }
  | { type: 'friend_request'; targetUserId: string }
  | { type: 'friend_accept'; requesterId: string }
  | { type: 'friend_reject'; requesterId: string }
  | { type: 'create_game'; mode: 'duo' | 'trio'; bet: number; gridSize: number; mineCount: number }
  | { type: 'invite_friend'; friendId: string; gameId: string }
  | { type: 'join_game'; gameId: string; bet: number }
  | { type: 'ready'; gameId: string }
  | { type: 'make_move'; gameId: string; row: number; col: number }
  | { type: 'cashout'; gameId: string }
  | { type: 'chat'; gameId: string; message: string }
  | { type: 'get_friends' }
  | { type: 'get_games' };

export type WSResponse =
  | { type: 'auth_success'; user: User }
  | { type: 'error'; message: string }
  | { type: 'friends_list'; friends: User[]; requests: User[] }
  | { type: 'friend_request_received'; from: User }
  | { type: 'friend_added'; friend: User }
  | { type: 'game_created'; game: GameSession }
  | { type: 'game_invite'; game: GameSession; from: User }
  | { type: 'game_joined'; game: GameSession }
  | { type: 'game_updated'; game: GameSession }
  | { type: 'game_started'; game: GameSession }
  | { type: 'turn_result'; game: GameSession; action: TurnAction }
  | { type: 'game_over'; game: GameSession; payouts: { userId: string; amount: number }[] }
  | { type: 'chat_message'; message: ChatMessage }
  | { type: 'games_list'; games: GameSession[] }
  | { type: 'cashout_success'; game: GameSession; amount: number };
