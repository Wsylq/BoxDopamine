import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getState, subscribe, formatCurrency, resetBalance, sounds, haptics } from './store/gameStore';
import GameReel from './components/GameReel';
import ParticleEffect from './components/ParticleEffect';
import P2PMultiplayer from './components/multiplayer/P2PMultiplayer';
import FriendsScreen from './components/multiplayer/FriendsScreen';
import AuthScreen from './components/AuthScreen';
import AchievementToast from './components/AchievementToast';
import { relayService } from './services/relayService';
import { friendsService, GameInvite } from './services/friendsService';
import { authService } from './services/authService';
import { achievementService } from './services/achievementService';

const GOAL = 10_000_000;

function StatRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between py-3"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span className="text-white/50 text-sm">{label}</span>
      <span className="font-bold text-base" style={{ color: accent ?? '#fff' }}>{value}</span>
    </div>
  );
}

type Tab = 'feed' | 'stats' | 'multiplayer' | 'friends';

const GAME_LABELS: Record<string, string> = {
  minesweeper: '💣 Team Minesweeper',
  avalanche:   '🏔️ Avalanche',
  blackjack:   '🃏 Collective Blackjack',
};

export default function App() {
  const [authed, setAuthed] = useState(authService.isLoggedIn());
  const [tab, setTab] = useState<Tab>('feed');
  const [gameState, setGameState] = useState(getState());
  const [showParticles, setShowParticles] = useState(false);
  const [pendingInvite, setPendingInvite] = useState<GameInvite | null>(null);
  const [inviteJoinRoom, setInviteJoinRoom] = useState<string | null>(null);
  const [, setAchievementTick] = useState(0); // forces re-render on unlock

  useEffect(() => {
    const unsub = achievementService.onUnlock(() => setAchievementTick(t => t + 1));
    return unsub;
  }, []);

  // On refresh: already logged in but balanceService not initialized — fetch from server
  useEffect(() => {
    if (!authService.isLoggedIn()) return;
    const user = authService.getUser();
    if (!user) return;
    // Re-fetch balance by sending auth_login over WS with stored token
    // We do this by opening a one-shot WS and sending a balance_fetch request
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://node05.host2play.gratis:5038';
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'balance_fetch', token: user.token }));
    };
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'balance_update' || data.type === 'balance_ok') {
          import('./services/balanceService').then(({ balanceService }) => {
            balanceService.init(data.balance);
          });
          ws.close();
        }
      } catch {}
    };
    ws.onerror = () => ws.close();
    return () => ws.close();
  }, []);

  useEffect(() => {
    const unsub = subscribe(() => {
      const prev = gameState.balance;
      const next = getState().balance;
      setGameState(getState());
        if (next > prev) {
          if (next - prev >= 500) {
          setShowParticles(true);
          setTimeout(() => setShowParticles(false), 2000);
        }
      }
    });
    return () => { unsub(); };
  }, [gameState.balance]);

  const { balance, streak, totalWins, totalLosses, biggestWin } = gameState;
  const goalPct = Math.min(100, (balance / GOAL) * 100);
  const winRate = totalWins + totalLosses > 0
    ? ((totalWins / (totalWins + totalLosses)) * 100).toFixed(1)
    : '—';

  const switchTab = useCallback((t: Tab) => {
    setTab(t);
    sounds.swoosh();
    haptics.light();
  }, []);

  // Global relay listener for incoming game invites
  useEffect(() => {
    if (!authed) return;
    const user = authService.getUser();
    if (user) relayService.username = user.username;
    const username = relayService.getUsername();
    relayService.connectPresence(username);

    const unsub = relayService.subscribe((data) => {
      if (data.type === 'game_invite') {
        const invite: GameInvite = {
          fromUsername: data.fromUsername,
          roomId: data.roomId,
          gameType: data.gameType,
          receivedAt: Date.now(),
        };
        setPendingInvite(invite);
        sounds.reward();
        haptics.heavy();
      }
    });
    return () => unsub();
  }, [authed]);

  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ background: '#000', maxWidth: 430, margin: '0 auto' }}
    >
      {/* ── Auth gate ── */}
      {!authed && (
        <AuthScreen onAuth={() => {
          // Ensure relay username is set from the logged-in user
          const user = authService.getUser();
          if (user) relayService.username = user.username;
          setAuthed(true);
        }} />
      )}

      {authed && (<>
      <AchievementToast />
      {showParticles && <ParticleEffect active={showParticles} originX={0.5} originY={0.08} />}

      {/* ── Content Area ── */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {tab === 'feed' && (
            <motion.div
              key="feed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              <GameReel />
            </motion.div>
          )}

          {tab === 'multiplayer' && (
            <motion.div
              key="multiplayer"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              <P2PMultiplayer
                inviteJoinRoom={inviteJoinRoom}
                onInviteConsumed={() => setInviteJoinRoom(null)}
              />
            </motion.div>
          )}

          {tab === 'friends' && (
            <motion.div
              key="friends"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0"
            >
              <FriendsScreen />
            </motion.div>
          )}

          {tab === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 overflow-y-auto"
              style={{ paddingTop: 72, paddingBottom: 100 }}
            >
              {/* Stats Header */}
              <div className="px-5 pt-4 pb-6">
                <div className="text-white font-black text-2xl">Your Stats</div>
                <div className="text-white/40 text-sm">Track your dopamine journey</div>
              </div>

              <div className="px-5 space-y-4 pb-8">
                {/* Goal progress */}
                <div
                  className="rounded-3xl p-5"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,215,0,0.12) 0%, rgba(255,140,0,0.08) 100%)',
                    border: '1px solid rgba(255,215,0,0.2)',
                  }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">🏆</span>
                    <div>
                      <div className="text-white font-black">$10 Million Goal</div>
                      <div className="text-white/40 text-sm">{goalPct.toFixed(3)}% there</div>
                    </div>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: 'linear-gradient(90deg, #FFD700, #FFA500)' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${goalPct}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-white/40">
                    <span>{formatCurrency(balance)}</span>
                    <span>$10M</span>
                  </div>
                </div>

                {/* Balance card */}
                <div
                  className="rounded-3xl p-5"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div className="text-white/40 text-xs font-bold mb-1 tracking-widest uppercase">Performance</div>
                  <StatRow label="Balance" value={formatCurrency(balance)} accent="#FFD700" />
                  <StatRow label="Daily Streak" value={`🔥 ${streak} day${streak !== 1 ? 's' : ''}`} accent="#FF6B6B" />
                  <StatRow label="Total Wins" value={String(totalWins)} accent="#22c55e" />
                  <StatRow label="Total Losses" value={String(totalLosses)} accent="#ef4444" />
                  <StatRow label="Win Rate" value={`${winRate}%`} />
                  <StatRow label="Biggest Win" value={formatCurrency(biggestWin)} accent="#a78bfa" />
                </div>

                {/* Educational note */}
                <div
                  className="rounded-3xl p-5"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div className="text-white/40 text-xs font-bold mb-3 tracking-widest uppercase">⚠️ Educational</div>
                  <div className="text-white/50 text-xs leading-relaxed">
                    This is a <span className="text-white/80">satirical/educational</span> project demonstrating
                    psychological techniques: variable ratio reinforcement, loss aversion,
                    sunk cost bias, and fast dopamine feedback loops.
                    <br /><br />
                    Inspired by{' '}
                    <span className="text-blue-400">Jaxon Poulton's</span> YouTube video
                    "I Built the World's Most Addictive App".
                  </div>
                </div>

                {/* Reset */}
                <button
                  onClick={() => {
                    if (window.confirm('Reset balance to $1,000?')) {
                      resetBalance();
                      sounds.click();
                      haptics.heavy();
                    }
                  }}
                  className="w-full py-3 rounded-2xl font-bold text-sm"
                  style={{
                    background: 'rgba(239,68,68,0.12)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    color: '#ef4444',
                  }}
                >
                  🔄 Reset Balance to $1,000
                </button>

                {/* Achievements */}
                {(() => {
                  const all = achievementService.getAll();
                  const unlocked = all.filter(a => a.unlockedAt);
                  return (
                    <div className="rounded-3xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="text-white/40 text-xs font-bold mb-3 tracking-widest uppercase">
                        🏅 Achievements ({unlocked.length}/{all.length})
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {all.map(a => (
                          <div key={a.id}
                            className="rounded-2xl p-3 text-center flex flex-col items-center gap-1"
                            style={{
                              background: a.unlockedAt ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.03)',
                              border: `1px solid ${a.unlockedAt ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.06)'}`,
                              opacity: a.unlockedAt ? 1 : 0.4,
                            }}>
                            <div className="text-2xl" style={{ filter: a.unlockedAt ? 'none' : 'grayscale(1)' }}>{a.emoji}</div>
                            <div className="text-white font-bold text-xs leading-tight">{a.name}</div>
                            <div className="text-white/40 text-xs leading-tight">{a.desc}</div>
                            {a.unlockedAt && (
                              <div className="text-white/30 text-xs mt-0.5">
                                {new Date(a.unlockedAt).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Account */}
                <div className="rounded-3xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="text-white/40 text-xs font-bold mb-3 tracking-widest uppercase">Account</div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-bold">{authService.getUser()?.username}</div>
                      <div className="text-white/40 text-xs">Logged in</div>
                    </div>
                    <button onClick={() => {
                      if (window.confirm('Log out?')) {
                        authService.logout();
                        setAuthed(false);
                        sounds.click();
                      }
                    }} className="px-4 py-2 rounded-xl text-sm font-bold"
                      style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                      Log Out
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Game Invite Overlay ── */}
      <AnimatePresence>
        {pendingInvite && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center px-6 z-[200]"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ scale: 0.85, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 20 }}
              className="w-full max-w-sm rounded-3xl p-6 text-center"
              style={{
                background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.15))',
                border: '1px solid rgba(59,130,246,0.4)',
                boxShadow: '0 0 40px rgba(59,130,246,0.2)',
              }}
            >
              <div className="text-4xl mb-3">🎮</div>
              <div className="text-white font-black text-xl mb-1">Game Invite!</div>
              <div className="text-white/70 text-sm mb-1">
                <span className="text-white font-bold">{pendingInvite.fromUsername}</span> invited you to
              </div>
              <div className="text-white font-bold text-lg mb-4">
                {GAME_LABELS[pendingInvite.gameType] ?? pendingInvite.gameType}
              </div>
              <div className="text-white/40 text-xs mb-5 font-mono">Room: {pendingInvite.roomId}</div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setPendingInvite(null);
                    sounds.click();
                    haptics.light();
                  }}
                  className="flex-1 py-3 rounded-xl font-bold"
                  style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', color: '#ef4444' }}
                >
                  Decline
                </button>
                <button
                  onClick={() => {
                    const roomId = pendingInvite.roomId;
                    setPendingInvite(null);
                    relayService.disconnect();
                    relayService.connect(false, roomId);
                    setInviteJoinRoom(roomId);
                    setTab('multiplayer');
                    sounds.reward();
                    haptics.heavy();
                  }}
                  className="flex-1 py-3 rounded-xl font-bold"
                  style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff' }}
                >
                  Accept 🎯
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Liquid Glass Bottom Nav ── */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-center z-50"
        style={{ 
          paddingBottom: 'max(20px, env(safe-area-inset-bottom))', 
          padding: '0 20px max(20px, env(safe-area-inset-bottom))' 
        }}>
        <motion.div
          className="flex items-center rounded-3xl"
          style={{
            background: 'rgba(0,0,0,0.85)',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.1) inset, 0 -1px 0 rgba(0,0,0,0.2) inset',
          }}
        > {...([
            { id: 'feed' as Tab, emoji: '🎮', label: 'Play' },
            { id: 'multiplayer' as Tab, emoji: '👥', label: 'Multi' },
            { id: 'friends' as Tab, emoji: '👤', label: 'Friends' },
            { id: 'stats' as Tab, emoji: '📊', label: 'Stats' },
          ]).map((item, idx, arr) => {
            const isActive = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => switchTab(item.id)}
                className="flex flex-col items-center gap-0.5 transition-all rounded-3xl"
                style={{
                  padding: '10px 24px',
                  background: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                  borderRight: idx < arr.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  position: 'relative',
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-3xl"
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.15)',
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="text-xl relative z-10">{item.emoji}</span>
                <span
                  className="text-xs font-bold relative z-10 transition-all"
                  style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.4)' }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </motion.div>
        </div>
        </>)}
        </div>
        );
        }
