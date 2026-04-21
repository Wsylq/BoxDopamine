// ═══════════════════════════════════════════════════════════
// Auth Screen — Login / Register
// ═══════════════════════════════════════════════════════════

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { authService } from '../services/authService';
import { sounds, haptics } from '../store/gameStore';

interface Props {
  onAuth: () => void;
}

export default function AuthScreen({ onAuth }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!username.trim()) return 'Username is required';
    if (username.trim().length < 3) return 'Username must be at least 3 characters';
    if (username.trim().length > 20) return 'Username max 20 characters';
    if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) return 'Username: letters, numbers, _ and - only';
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    if (mode === 'register' && password !== confirm) return 'Passwords do not match';
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await authService.login(username.trim(), password);
      } else {
        await authService.register(username.trim(), password);
      }
      sounds.reward();
      haptics.win();
      onAuth();
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
      haptics.lose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center px-6"
      style={{ background: 'linear-gradient(180deg, #0a0a0f 0%, #000 100%)', maxWidth: 430, margin: '0 auto' }}>

      {/* Logo */}
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-8 text-center">
        <div className="text-5xl mb-3">🎰</div>
        <div className="text-white font-black text-3xl">Dopamine Box</div>
        <div className="text-white/40 text-sm mt-1">Play money · No real gambling</div>
      </motion.div>

      {/* Card */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
        className="w-full rounded-3xl p-6"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>

        {/* Tab toggle */}
        <div className="flex rounded-xl overflow-hidden mb-6"
          style={{ background: 'rgba(255,255,255,0.06)' }}>
          {(['login', 'register'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); }}
              className="flex-1 py-2.5 text-sm font-bold transition-all"
              style={{
                background: mode === m ? 'rgba(255,255,255,0.12)' : 'transparent',
                color: mode === m ? '#fff' : 'rgba(255,255,255,0.4)',
                borderRadius: 10,
              }}>
              {m === 'login' ? 'Log In' : 'Register'}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div className="space-y-3 mb-4">
          <div>
            <div className="text-white/50 text-xs mb-1 ml-1">Username</div>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSubmit()}
              placeholder="e.g. coolplayer99"
              autoCapitalize="none"
              autoCorrect="off"
              className="w-full px-4 py-3 rounded-xl text-white"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', outline: 'none' }}
            />
          </div>
          <div>
            <div className="text-white/50 text-xs mb-1 ml-1">Password</div>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Min 6 characters"
              className="w-full px-4 py-3 rounded-xl text-white"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', outline: 'none' }}
            />
          </div>
          <AnimatePresence>
            {mode === 'register' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                <div className="text-white/50 text-xs mb-1 ml-1">Confirm Password</div>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="Repeat password"
                  className="w-full px-4 py-3 rounded-xl text-white"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', outline: 'none' }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-4 px-4 py-2 rounded-xl text-sm"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={loading}
          className="w-full py-3 rounded-xl font-black text-base"
          style={{
            background: loading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            color: loading ? 'rgba(255,255,255,0.3)' : '#000',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}>
          {loading ? '...' : mode === 'login' ? 'Log In' : 'Create Account'}
        </button>
      </motion.div>

      <div className="mt-6 text-white/20 text-xs text-center px-4">
        Play money only. No real money involved. 18+ for entertainment purposes.
      </div>
    </div>
  );
}
