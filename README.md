# Dopamine Box

Gambling app demonstrating psychological techniques (variable ratio reinforcement, loss aversion, dopamine feedback).

## 🎮 Quick Start

### Single Player (Web)

```bash
npm install
npm run dev
```

### 👥 Multiplayer Mode (NEW!)

**Windows:**
```bash
start-multiplayer.bat
```

**Mac/Linux:**
```bash
chmod +x start-multiplayer.sh
./start-multiplayer.sh
```

Or manually:
```bash
# Terminal 1 - Server
cd server
npm install
npm run dev

# Terminal 2 - Client
npm install
npm run dev
```

📖 **[Full Multiplayer Setup Guide](MULTIPLAYER_SETUP.md)**

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

### Multiplayer (NEW!)
💣 **Team Minesweeper** - Duo & Trio modes
👥 **Friends System** - Add friends and invite to games
💬 **Real-time Chat** - Coordinate with teammates
💰 **Betting & Cashout** - Each player bets their own amount
📈 **Dynamic Multiplier** - Increases as you reveal safe cells
🎯 **Turn-based** - Take turns revealing cells

## How to Play Multiplayer

1. **Add Friends** - Go to Friends tab, enter their User ID
2. **Create Game** - Choose duo/trio, set bet amount and grid size
3. **Invite Friends** - Send invites from the waiting room
4. **Play Together** - Take turns revealing cells, avoid mines!
5. **Cash Out** - Secure your winnings anytime or go for the full board

Educational/satirical project inspired by Jaxon Poulton's "I Built the World's Most Addictive App".
