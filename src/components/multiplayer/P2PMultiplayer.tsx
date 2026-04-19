// ═══════════════════════════════════════════════════════════
// Multiplayer - Host or Join (WebSocket Relay)
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { relayService } from '../../services/relayService';
import { sounds, haptics } from '../../store/gameStore';
import RelayMinesweeper from './RelayMinesweeper';
import FriendsScreen from './FriendsScreen';

export default function P2PMultiplayer() {
  const [view, setView] = useState<'menu' | 'host' | 'join' | 'game' | 'friends'>('menu');
  const [hostId, setHostId] = useState('');
  const [joinId, setJoinId] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [connected, setConnected] = useState(false);

  const handleHost = () => {
    setIsHost(true);
    const roomId = relayService.connect(true);
    setHostId(roomId);
    setView('host');
    sounds.coin();
    haptics.medium();
  };

  const handleJoin = (id?: string) => {
    const roomId = id || joinId.trim();
    if (!roomId) {
      alert('Please enter a Room ID');
      return;
    }
    
    console.log('Joining room:', roomId);
    setIsHost(false);
    relayService.connect(false, roomId);
    setView('game');
    sounds.click();
    haptics.light();
  };

  const copyHostId = () => {
    navigator.clipboard.writeText(hostId);
    sounds.coin();
    haptics.light();
    alert('Room ID copied! Share with friends.');
  };

  const handleInviteFriend = (friendId: string) => {
    // Auto-fill join ID and switch to join view
    setJoinId(friendId);
    handleJoin(friendId);
  };

  useEffect(() => {
    const unsub = relayService.subscribe((data) => {
      if (data.type === 'player_joined') {
        setConnected(true);
        sounds.coin();
        haptics.medium();
      }
    });
    
    return () => {
      unsub();
    };
  }, []);

  if (view === 'game') {
    return <RelayMinesweeper isHost={isHost} onBack={() => {
      relayService.disconnect();
      setView('menu');
      setHostId('');
      setJoinId('');
      setConnected(false);
    }} />;
  }

  if (view === 'friends') {
    return (
      <div className="h-full flex flex-col">
        <div className="px-5 py-4">
          <button
            onClick={() => setView('menu')}
            className="text-white/60 text-sm"
          >
            ← Back
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <FriendsScreen onInvite={handleInviteFriend} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto" style={{ paddingTop: 72, paddingBottom: 100 }}>
      <div className="px-5 pt-4 pb-6">
        <div className="text-white font-black text-2xl">Multiplayer</div>
        <div className="text-white/40 text-sm">Play with friends instantly</div>
      </div>

      <div className="px-5 space-y-4 pb-8">
        {view === 'menu' && (
          <>
            <button
              onClick={handleHost}
              className="w-full py-4 rounded-2xl font-bold"
              style={{
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: '#fff',
              }}
            >
              🎮 Host Game
            </button>

            <div
              className="rounded-3xl p-5"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div className="text-white font-bold mb-3">Join Game</div>
              <input
                type="text"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value.toUpperCase())}
                placeholder="Enter Room ID (e.g., ABC123)"
                className="w-full px-4 py-3 rounded-xl text-white mb-3"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              />
              <button
                onClick={() => handleJoin()}
                className="w-full py-3 rounded-xl font-bold"
                style={{
                  background: 'rgba(59,130,246,0.2)',
                  border: '1px solid #3b82f6',
                  color: '#3b82f6',
                }}
              >
                Join
              </button>
            </div>

            <button
              onClick={() => setView('friends')}
              className="w-full py-3 rounded-2xl font-bold"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#fff',
              }}
            >
              👤 Friends
            </button>
          </>
        )}

        {view === 'host' && (
          <div
            className="rounded-3xl p-5"
            style={{
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid #22c55e',
            }}
          >
            <div className="text-white font-bold mb-3">🎮 Hosting Game</div>
            <div className="text-white/60 text-sm mb-3">Share this Room ID:</div>
            
            <div
              className="p-4 rounded-xl mb-3"
              style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div className="text-white font-mono text-2xl text-center font-black">{hostId}</div>
            </div>

            <button
              onClick={copyHostId}
              className="w-full py-3 rounded-xl font-bold mb-3"
              style={{
                background: '#22c55e',
                color: '#fff',
              }}
            >
              📋 Copy Room ID
            </button>

            <div className="text-white/60 text-xs mb-3 text-center">
              {connected ? '✅ Player connected!' : '⏳ Waiting for players...'}
            </div>

            <button
              onClick={() => setView('game')}
              className="w-full py-3 rounded-xl font-bold"
              style={{
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                color: '#000',
              }}
            >
              Start Game
            </button>

            <button
              onClick={() => {
                relayService.disconnect();
                setView('menu');
                setHostId('');
              }}
              className="w-full py-2 rounded-xl font-bold mt-2 text-white/60 text-sm"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
