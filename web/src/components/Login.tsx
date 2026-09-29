import { useState } from 'react';
import { authStore } from '../stores/authStore';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = authStore((s) => s.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <form
        onSubmit={handleSubmit}
        className="w-80 p-6 rounded-lg"
        style={{ background: 'var(--panel)' }}
      >
        <h1 className="text-xl font-semibold mb-6 text-center" style={{ color: 'var(--text)' }}>
          WAHA Engine
        </h1>

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-3 py-2 mb-3 rounded-md text-sm outline-none"
          style={{ background: 'var(--panel-hover)', color: 'var(--text)' }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 mb-4 rounded-md text-sm outline-none"
          style={{ background: 'var(--panel-hover)', color: 'var(--text)' }}
        />

        {error && (
          <div className="text-red-400 text-xs mb-3">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-md text-sm font-medium transition-colors"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
