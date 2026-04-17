# 📦 Dopamine Box — React Web App

> **The World's Most Addictive App** — React/Vite/TypeScript edition
> Inspired by Jaxon Poulton's YouTube video "I Built the World's Most Addictive App"

---

## 🚀 Features

### Core Addictive Loop
- **Infinite Scrolling Feed** — Content that never ends, accelerating as you scroll faster
- **Hybrid gambling + scroll** — Winning mini-games rewards and continues the scroll; losing pushes you deeper
- **$10 Million Goal** — Try to reach $10M but it can all disappear in one bad game
- **Heavy dopamine UI** — Flashy animations, particle effects on wins, bright high-contrast colors

### 🔥 Streak System
- Daily streak counter with fear-of-breaking mechanic
- Prominent streak display (just like Snapchat streaks)
- Streak bonuses for consecutive days

### 🎮 Four Mini-Games

#### 🪙 Coin Flip
- Classic heads or tails betting
- Multiple bet options ($10 → $5,000)
- Animated coin with 3D flip effect
- Win = 2x your bet

#### 🃏 Higher or Lower
- Card-style guessing game
- Chain wins for escalating multipliers (2x, 4x, 8x...)
- Cash out anytime or risk it all
- "Double-or-nothing" psychology

#### 🎯 Plinko
- Physics-simulated ball drop through pegs
- 9 multiplier slots (0.2x — 2.0x)
- Satisfying bounce sounds at each peg
- Risk vs reward at the edges

#### 🐦 Flappy Coins
- Exact Flappy Bird clone but you flap through coins
- Earn real in-game currency per coin collected
- **"WOOHOO!"** celebration on 5+ coins
- High score tracking

### 💰 Currency System
- Starts at $1,000
- Earn from free rewards in feed
- Play games to grow balance
- Goal: $10,000,000 (try not to go broke first!)

### 🎵 Sound & Haptics
- Web Audio API sound engine (no external files needed)
- Win/lose sounds, coin sounds, Woohoo! melody
- Navigator.vibrate() haptic patterns for all interactions
- iOS Core Haptics-inspired patterns

### 🎨 UI/UX
- iOS-inspired design using Inter font (closest to SF Pro available on web)
- Dark mode-free: bright, addictive color scheme
- Particle effects on big wins
- Smooth Framer Motion animations
- PWA-ready (works on mobile browsers)

---

## 🛠 Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 19 | UI Framework |
| TypeScript | 5.9 | Type safety |
| Vite | 7 | Build tool |
| Tailwind CSS | 4 | Utility styles |
| Framer Motion | Latest | Animations |
| Web Audio API | Native | Sound effects |
| Navigator.vibrate | Native | Haptics |
| Canvas API | Native | Plinko + Flappy games |
| localStorage | Native | Persistence |

---

## 📦 Build & Run

### Prerequisites
- Node.js 18+
- npm 9+

### Development
```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Open http://localhost:5173
```

### Production Build
```bash
npm run build
# Output in dist/index.html (single file)
```

### Preview Production
```bash
npm run preview
```

---

## 📁 Project Structure

```
src/
├── App.tsx                 # Main app component + Stats + Games screens
├── index.css               # Global styles + animations
├── main.tsx                # React entry point
├── store/
│   └── gameStore.ts        # Currency, haptics, sounds, storage
├── components/
│   ├── InfiniteFeed.tsx    # The infinite scroll dopamine feed
│   ├── GameModal.tsx       # Full-screen game overlay
│   └── ParticleEffect.tsx  # Canvas particle explosions
└── games/
    ├── CoinFlip.tsx        # Coin flip mini-game
    ├── HigherLower.tsx     # Higher/Lower card game
    ├── Plinko.tsx          # Plinko ball drop game
    └── FlappyCoins.tsx     # Flappy Bird coin collector
```

---

## 🧠 Psychological Hooks (Educational)

This app intentionally implements the same psychological techniques used in slot machines and social media apps:

1. **Variable Ratio Reinforcement** — Random rewards keep you engaged
2. **Loss Aversion** — "Don't break your streak!" creates fear
3. **Near-Miss Effect** — Plinko shows you how close you came
4. **Sunk Cost Fallacy** — "I've already invested, keep going"
5. **Progress Toward Goal** — The $10M tracker always beckons
6. **Social Proof Momentum** — Feed makes it look like others are winning
7. **Fast Feedback Loops** — Instant sound + visual = immediate dopamine

> ⚠️ **This is a satirical/educational project.** Real gambling can be harmful. Please gamble responsibly.

---

## 🎯 Original Video

Watch Jaxon Poulton's original video: [I Built the World's Most Addictive App](https://youtu.be/mRzqD-yRZJU)

---

## 📝 License

MIT — Educational/satirical purposes only.
