// ═══════════════════════════════════════════════════════════
// Friends Screen — add by username, invite from waiting room
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { friendsService } from '../../services/friendsService';
import { relayService } from '../../services/relayService';
import { sounds, haptics } from '../../store/gameStore';

export default function FriendsScreen() {
  const [friends, setFriends] = useState(friendsService.getFriends());
  const [username, setUsername] = useState('');
  const myUsername = relayService.getUsername();

  useEffect(() => {
    const unsub = friendsService.subscribe(() => setFriends(friendsService.getFriends()));
    return unsub;
  }, []);

  const handleAdd = () => {
    const trimmed = username.trim();
    if (!trimmed) return;
    if (trimmed.toLowerCase() === myUsername.toLowerCase()) {
      alert("That's you!");
      return;
    }
    // username IS the id — no separate room ID needed
    friendsService.addFriend(trimmed, trimmed);
    setUsername('');
    sounds.coin();
    haptics.light();
  };

  const handleRemove = (id: string) => {
    if (confirm('Remove this friend?')) {
      friendsService.removeFriend(id);
      sounds.click();
      haptics.light();
    }
  };

  return (
    <div className="h-full overflow-y-auto" style={{ paddingTop: 72, paddingBottom: 100 }}>
      <div className="px-5 pt-4 pb-6">
        <div className="text-white font-black text-2xl">Friends</div>
        <div className="text-white/40 text-sm">Add friends by username</div>
      </div>

      <div className="px-5 space-y-4 pb-8">

        {/* Your username */}
        <div className="rounded-2xl p-4" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)' }}>
          <div className="text-white/50 text-xs mb-1">Your username (share this so friends can add you)</div>
          <div className="text-white font-bold text-lg font-mono">{myUsername}</div>
          <div className="text-white/30 text-xs mt-1">Friends must type this exactly to invite you</div>
        </div>

        {/* Add friend */}
        <div className="rounded-3xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="text-white font-bold mb-3">Add Friend</div>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleAdd()}
            placeholder="Enter their username"
            className="w-full px-4 py-3 rounded-xl text-white mb-3"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
          />
          <button onClick={handleAdd} className="w-full py-2 rounded-xl font-bold text-sm"
            style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff' }}>
            Add Friend
          </button>
        </div>

        {/* Friends list */}
        <div className="rounded-3xl p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="text-white font-bold mb-3">Friends ({friends.length})</div>
          {friends.length === 0 ? (
            <div className="text-white/40 text-sm text-center py-8">No friends yet. Add someone above!</div>
          ) : (
            <div className="space-y-2">
              {friends.map(friend => (
                <motion.div key={friend.id} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div className="text-white font-bold text-sm">{friend.name}</div>
                  <button onClick={() => handleRemove(friend.id)}
                    className="px-3 py-1 rounded-lg text-xs font-bold"
                    style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                    Remove
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="text-white/50 text-xs">
            💡 To invite a friend to your game, host a game and tap their name in the <b>Invite Friends</b> panel inside the waiting room.
          </div>
        </div>
      </div>
    </div>
  );
}
