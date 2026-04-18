// ═══════════════════════════════════════════════════════════
// Friends Screen (Local Storage)
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { friendsService } from '../../services/friendsService';
import { sounds, haptics } from '../../store/gameStore';

interface Props {
  onInvite?: (friendId: string) => void;
}

export default function FriendsScreen({ onInvite }: Props) {
  const [friends, setFriends] = useState(friendsService.getFriends());
  const [friendId, setFriendId] = useState('');
  const [friendName, setFriendName] = useState('');

  useEffect(() => {
    const unsub = friendsService.subscribe(() => {
      setFriends(friendsService.getFriends());
    });
    return unsub;
  }, []);

  const handleAdd = () => {
    if (friendId.trim() && friendName.trim()) {
      friendsService.addFriend(friendId.trim(), friendName.trim());
      setFriendId('');
      setFriendName('');
      sounds.coin();
      haptics.light();
    }
  };

  const handleRemove = (id: string) => {
    if (confirm('Remove this friend?')) {
      friendsService.removeFriend(id);
      sounds.click();
      haptics.light();
    }
  };

  const handleInvite = (id: string) => {
    if (onInvite) {
      onInvite(id);
      sounds.reward();
      haptics.medium();
    }
  };

  return (
    <div className="h-full overflow-y-auto" style={{ paddingTop: 72, paddingBottom: 100 }}>
      <div className="px-5 pt-4 pb-6">
        <div className="text-white font-black text-2xl">Friends</div>
        <div className="text-white/40 text-sm">Manage your friends list</div>
      </div>

      <div className="px-5 space-y-4 pb-8">
        {/* Add Friend */}
        <div
          className="rounded-3xl p-5"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="text-white font-bold mb-3">Add Friend</div>
          <input
            type="text"
            value={friendName}
            onChange={(e) => setFriendName(e.target.value)}
            placeholder="Friend's Name"
            className="w-full px-4 py-2 rounded-xl text-white text-sm mb-2"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          />
          <input
            type="text"
            value={friendId}
            onChange={(e) => setFriendId(e.target.value)}
            placeholder="Room ID (they share with you)"
            className="w-full px-4 py-2 rounded-xl text-white text-sm mb-3"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          />
          <button
            onClick={handleAdd}
            className="w-full py-2 rounded-xl font-bold text-sm"
            style={{
              background: 'linear-gradient(135deg, #22c55e, #16a34a)',
              color: '#fff',
            }}
          >
            Add Friend
          </button>
        </div>

        {/* Friends List */}
        <div
          className="rounded-3xl p-5"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="text-white font-bold mb-3">Your Friends ({friends.length})</div>
          {friends.length === 0 ? (
            <div className="text-white/40 text-sm text-center py-8">
              No friends yet. Add some above!
            </div>
          ) : (
            <div className="space-y-2">
              {friends.map((friend) => (
                <motion.div
                  key={friend.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <div className="flex-1">
                    <div className="text-white font-bold text-sm">{friend.name}</div>
                    <div className="text-white/40 text-xs font-mono">{friend.id}</div>
                  </div>
                  <div className="flex gap-2">
                    {onInvite && (
                      <button
                        onClick={() => handleInvite(friend.id)}
                        className="px-4 py-1.5 rounded-lg text-xs font-bold"
                        style={{ background: '#22c55e', color: '#fff' }}
                      >
                        Invite
                      </button>
                    )}
                    <button
                      onClick={() => handleRemove(friend.id)}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold"
                      style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}
                    >
                      Remove
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div
          className="rounded-3xl p-4"
          style={{
            background: 'rgba(59,130,246,0.1)',
            border: '1px solid rgba(59,130,246,0.2)',
          }}
        >
          <div className="text-white/80 text-xs">
            💡 <strong>Tip:</strong> When you host a game, share your Room ID with friends. They can save it here for quick invites later!
          </div>
        </div>
      </div>
    </div>
  );
}
