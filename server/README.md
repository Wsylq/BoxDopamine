# Dopamine Box Multiplayer Server

WebSocket server for team minesweeper multiplayer functionality.

## Quick Start

\`\`\`bash
npm install
npm run dev
\`\`\`

Server runs on `http://localhost:3001`

## Scripts

- `npm run dev` - Development mode with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run production build

## Environment Variables

- `PORT` - Server port (default: 3001)

## API

### WebSocket Endpoint

\`\`\`
ws://localhost:3001
\`\`\`

### Health Check

\`\`\`
GET /health
\`\`\`

Returns server status and statistics.

## Documentation

See `../MULTIPLAYER_SETUP.md` for full documentation.
