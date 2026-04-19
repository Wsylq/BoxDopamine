# Dopamine Box

Gambling app demonstrating psychological techniques (variable ratio reinforcement, loss aversion, dopamine feedback).

## 🎮 Quick Start

```bash
npm install
npm run dev
```

## 👥 Multiplayer (WebSocket Server)

**Server Setup:**
1. Upload `server.py` and `requirements.txt` to your Pterodactyl panel
2. Run: `pip install -r requirements.txt`
3. Run: `python server.py`
4. Server runs on: `node05.host2play.gratis:5038`

**Playing:**
1. Click **Multiplayer** tab
2. **Host**: Click "Host Game" → Share Room ID
3. **Join**: Enter Room ID → Click "Join"
4. Play with friends in real-time!

**Features:**
- Real-time WebSocket connection
- **Team Minesweeper** - Take turns, if ANY player hits a mine, EVERYONE loses!
- Individual betting - Each player bets their own amount
- Built-in chat
- Dynamic multiplier (1x → 3x) - Win together or lose together!

## Native Android (Kotlin + Compose)

**3-5x faster, 80% smaller than web wrapper**

```bash
cd android-native
./gradlew assembleDebug
```

APK: `android-native/app/build/outputs/apk/debug/app-debug.apk`

Or push to GitHub - Actions will build automatically.

## Features

### Single Player
🪙 Coin Flip • 🃏 Higher/Lower • 🎯 Plinko • 🎲 Dice • 🎫 Scratch Card • 📊 Stats • 🔥 Streaks

### Multiplayer (WebSocket)
💣 **Team Minesweeper** - 2-3 players
🌐 **WebSocket Server** - Python relay server
💰 **Individual Betting** - Each player bets their own amount
📈 **Dynamic Multiplier** - 1x → 3x based on progress
💬 **Built-in Chat** - Coordinate with teammates

Educational/satirical project inspired by Jaxon Poulton's "I Built the World's Most Addictive App".
