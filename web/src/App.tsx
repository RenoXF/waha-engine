import { useEffect } from 'react';
import { authStore } from './stores/authStore';
import { useSSE } from './hooks/useSSE';
import Login from './components/Login';
import Layout from './components/Layout';

export default function App() {
  const { user, loading, checkAuth } = authStore();

  useEffect(() => { checkAuth(); }, [checkAuth]);

  useSSE();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-[var(--text-secondary)]">Loading...</div>
      </div>
    );
  }

  return user ? <Layout /> : <Login />;
}
