// Reusable invite panel for waiting rooms
// Shows the host's friend list with one-tap invite buttons

import { useState, useEffect, useRef } from 'react';
import { friendsService } from '../../services/friendsService';
import { relayService } from '../../services/relayService';
import { sounds, haptics } from '../../store/gameStore';

type GameType = 'minesweeper' | 'avalanche' | 'blackjack';

interface Props {
  gameType: GameType;
  currentPlayers?: string[]; // usernames already in the room
}

const GAME_LABELS: Record<GameType, string> = {
  minesweeper: '💣 Team Minesweeper',
  avalanche:   '🏔️ Avalanche',
  blackjack:   '🃏 Collective Blackjack',
};

export default function InviteFriendsPanel({ gameType, currentPlayers = [] }: Props) {
  const [friends, setFriends] = useState(friendsService.getFriends());
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [sentTo, setSentTo] = useState<Record<string, boolean>>({});
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const unsub = friendsService.subscribe(() => setFriends(friendsService.getFriends()));
    return unsub;
  }, []);

  // Tick cooldowns every 200ms
  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      const next: Record<string, number> = {};
      friends.forEach(f => {
        const ms = friendsService.getInviteCooldown(f.id);
        if (ms > 0) next[f.id] = ms;
      });
      setCooldowns(next);
    }, 200);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [friends]);

  const handleInvite = (friendRoomId: string) => {
    if (friendsService.getInviteCooldown(friendRoomId) > 0) return;
    const myRoomId = relayService.getRoomId();
    const myUsername = relayService.getUsername();
    if (!myRoomId) return;

    relayService.sendInvite(friendRoomId, {
      type: 'game_invite',
      fromUsername: myUsername,
      roomId: myRoomId,
      gameType,
    });

    friendsService.recordInviteSent(friendRoomId);
    setSentTo(prev => ({ ...prev, [friendRoomId]: true }));
    setTimeout(() => setSentTo(prev => ({ ...prev, [friendRoomId]: false })), 3000);
    sounds.coin();
    haptics.medium();
  };

  if (friends.length === 0) return null;

  return (
    <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)' }}>
      <div className="text-white font-bold text-sm mb-1">👥 Invite Friends</div>
      <div className="text-white/40 text-xs mb-3">{GAME_LABELS[gameType]}</div>
      <div className="space-y-2">
        {friends.map(friend => {
          const cd = cooldowns[friend.id] ?? 0;
          const onCooldown = cd > 0;
          const sent = sentTo[friend.id];
          const alreadyIn = currentPlayers.some(
            p => p.toLowerCase() === friend.id.toLowerCase()
          );
          return (
            <div key={friend.id} className="flex items-center justify-between">
              <div>
                <div className="text-white text-sm font-bold">{friend.name}</div>
                <div className="text-white/30 text-xs font-mono">invite room: "{friend.id}"</div>
              </div>
              {alreadyIn ? (
                <span className="px-3 py-1 rounded-lg text-xs font-bold"
                  style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                  ✓ In room
                </span>
              ) : (
                <button
                  onClick={() => handleInvite(friend.id)}
                  disabled={onCooldown}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold flex-shrink-0"
                  style={{
                    background: sent ? 'rgba(34,197,94,0.2)' : onCooldown ? 'rgba(255,255,255,0.05)' : 'rgba(139,92,246,0.3)',
                    border: `1px solid ${sent ? '#22c55e' : onCooldown ? 'rgba(255,255,255,0.1)' : 'rgba(139,92,246,0.5)'}`,
                    color: sent ? '#22c55e' : onCooldown ? 'rgba(255,255,255,0.25)' : '#c4b5fd',
                    cursor: onCooldown ? 'not-allowed' : 'pointer',
                    minWidth: 72,
                  }}
                >
                  {sent ? '✓ Sent' : onCooldown ? `${Math.ceil(cd / 1000)}s` : 'Invite'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}