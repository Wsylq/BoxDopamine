# Multiplayer Setup

## Quick Start

**Local:**
```bash
# Terminal 1
cd server && npm install && npm run dev

# Terminal 2
npm run dev
```

**Remote (Ngrok):**
```bash
# Terminal 1: Server
cd server && npm run dev

# Terminal 2: Ngrok
ngrok http 3001

# Copy ngrok URL, update .env:
VITE_WS_URL=wss://YOUR-NGROK-URL

# Terminal 3: Client
npm run dev
```

## How to Play

1. **Friends tab** → Add friend by User ID
2. **Multiplayer tab** → Create game
3. Invite friend → Both ready → Play!

## Game Rules

- Turn-based minesweeper
- Each player bets individually
- Multiplier: 1x → 3x (based on progress)
- Cash out anytime or go for full board
- Hit mine = everyone loses

## Troubleshooting

- **Can't connect**: Check server running, verify `.env` URL
- **Low balance**: Play solo games or reset in Stats
- **Game won't start**: All players must click Ready
