Here's an honest breakdown of what's missing before this is publishable:

---

## Must-haves (blockers)

**Backend & persistence**
- <s>Real user accounts (username + password or OAuth) — right now usernames are just localStorage strings, anyone can impersonate anyone</s>
- Server-side game state validation — the host controls everything client-side, trivially cheatable
- Persistent balance stored server-side, not localStorage — currently anyone can open DevTools and set their balance to $1B
- HTTPS + WSS — plain ws:// breaks on any HTTPS deployment

**Core gameplay gaps**
- Sound effects that actually work — `sounds.flip()`, `sounds.reward()` etc. need real audio files wired up
- Mobile touch polish — tap targets, scroll behavior, safe area insets on notched phones
- Loading/error states — if the WebSocket server is down, users just see "Connecting..." forever with no retry UI or error message

---

## High-impact additions

**Progression & retention**
- Daily login bonus — streak system is already tracked, just needs a reward
- Leaderboard — top balances, biggest wins, most games played
- Achievement badges — "Survived 10 tiles", "Team cashout at 50x", "Blackjack natural 21"
- Level/XP system — unlock higher bet limits or cosmetic card backs as you level up

**Social**
- In-game emoji reactions during multiplayer (👀 😱 💀) — one tap, shows floating above your avatar
- Post-game share card — "We survived 15 tiles at 47x 🏔️" as a shareable image
- Spectator mode — watch a friend's game live without playing
- Friend sends request and option with either accept or reject.

**More games**
- **Pressure Cooker** (Crash) — multiplier climbs, everyone ejects when they want, last one before crash sets the team multiplier
- **Roulette** — team bets on the same spin, each picks their own number/color
- **Higher or Lower** — already exists as solo, make it team-based with voting

**Polish**
- <S>Onboarding flow — first-time tutorial explaining the concept</s>
- [x] Haptic patterns that match game events (different buzz for win vs loss vs bomb)
- [x] Card flip animations in Blackjack (3D CSS transform, not just spring scale)
- [x] Avalanche tile reveal with a camera shake on bomb hit
- <s>Dark/light theme toggle</S>

---

## Legal/compliance (required for app stores)

- Responsible gambling disclaimer on first launch
- "Play money only" clearly stated everywhere
- Age gate (18+ confirmation)
- Privacy policy + terms of service pages
- If publishing to App Store/Play Store: Apple and Google both prohibit simulated gambling apps — you'd need to frame it as a "social strategy game" and remove any real-money language

---

## Infrastructure

- Deploy the Python WebSocket server properly (not just `python server.py` on a VPS) — use nginx + systemd + SSL
- Rate limiting on the relay server — currently anyone can spam messages
- Room cleanup — idle rooms should expire after ~30 minutes
- Analytics — know which games people play most, where they drop off

---

The two biggest gaps right now are **persistent accounts** and **server-side validation**. Without those, the balance system is meaningless and the multiplayer is trivially exploitable. Everything else is polish on top of a solid foundation.

Want me to start on any of these?