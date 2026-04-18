// ═══════════════════════════════════════════════════════════
// Friends Management Screen
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { multiplayerService } from '../../services/multiplayerService';
import { User, WSResponse } from '../../types/multiplayer';
import { sounds, haptics } from '../../store/gameStore';

export default function FriendsScreen() {
  const [friends, setFriends] = useState<User[]>([]);
  const [requests, setRequests] = useState<User[]>([]);
  const [searchId, setSearchId] = useState('');

  useEffect(() => {
    multiplayerService.getFriends();

    const unsub = multiplayerService.subscribe((msg: WSResponse) => {
      if (msg.type === 'friends_list') {
        setFriends(msg.friends);
        setRequests(msg.requests);
      } else if (msg.type === 'friend_added') {
        setFriends(prev => [...prev, msg.friend]);
        sounds.coin();
        haptics.light();
      } else if (msg.type === 'friend_request_received') {
        setRequests(prev => [...prev, msg.from]);
        sounds.reward();
        haptics.medium();
      }
    });

    return unsub;
  }, []);

  const handleSendRequest = () => {
    if (searchId.trim()) {
      multiplayerService.sendFriendRequest(searchId.trim());
      setSearchId('');
      sounds.click();
      haptics.light();
    }
  };

  const handleAccept = (requesterId: string) => {
    multiplayerService.acceptFriendRequest(requesterId);
    setRequests(prev => prev.filter(r => r.id !== requesterId));
    sounds.win();
    haptics.medium();
  };

  const handleReject = (requesterId: string) => {
    multiplayerService.rejectFriendRequest(requesterId);
    setRequests(prev => prev.filter(r => r.id !== requesterId));
    sounds.click();
    haptics.light();
  };

  return (
    <div className="h-full overflow-y-auto" style={{ paddingTop: 72, paddingBottom: 100 }}>
      <div className="px-5 pt-4 pb-6">
        <div className="text-white font-black text-2xl">Friends</div>
        <div className="text-white/40 text-sm">Connect and play together</div>
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
          <div className="flex gap-2">
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Enter User ID"
              className="flex-1 px-4 py-2 rounded-xl text-white text-sm"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            />
            <button
              onClick={handleSendRequest}
              className="px-6 py-2 rounded-xl font-bold text-sm"
              style={{
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: '#fff',
              }}
            >
              Send
            </button>
          </div>
        </div>

        {/* Friend Requests */}
        {requests.length > 0 && (
          <div
            className="rounded-3xl p-5"
            style={{
              background: 'rgba(255,215,0,0.08)',
              border: '1px solid rgba(255,215,0,0.2)',
            }}
          >
            <div className="text-white font-bold mb-3">Friend Requests ({requests.length})</div>
            <div className="space-y-2">
              {requests.map((req) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <div>
                    <div className="text-white font-bold text-sm">{req.username}</div>
                    <div className="text-white/40 text-xs">{req.id}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(req.id)}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold"
                      style={{ background: '#22c55e', color: '#fff' }}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold"
                      style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}
                    >
                      Reject
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

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
              No friends yet. Add some to play together!
            </div>
          ) : (
            <div className="space-y-2">
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <div>
                    <div className="text-white font-bold text-sm">{friend.username}</div>
                    <div className="text-white/40 text-xs">{friend.id}</div>
                  </div>
                  <div className="text-green-400 text-xs">● Online</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
