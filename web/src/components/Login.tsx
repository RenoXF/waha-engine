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
    try { await login(username, password); }
    catch (err) { setError(String(err)); }
    finally { setLoading(false); }
  };

  return (
    <div className="h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* Left panel - Green with illustration */}
      <div className="hidden lg:flex lg:w-[40%] flex-col items-center justify-center p-12 login-left-panel">
        <div className="text-center max-w-md">
          <svg className="mx-auto mb-8" width="80" height="80" viewBox="0 0 24 24" fill="white" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))' }}>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          <h1 className="text-[28px] font-light text-white mb-4">WhatsApp Web</h1>
          <p className="text-[14px] text-white/80 leading-relaxed">
            Send and receive messages without keeping your phone online.
          </p>
          <p className="text-[14px] text-white/80 leading-relaxed mt-2">
            Use WhatsApp on up to 4 linked devices and 1 phone at the same time.
          </p>
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-[400px] animate-slide-up">
          {/* Mobile header (visible on small screens) */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ background: 'var(--accent)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <h1 className="text-[20px] font-semibold" style={{ color: 'var(--text)' }}>WhatsApp Web</h1>
          </div>

          {/* Login form */}
          <div className="rounded-lg p-8" style={{ background: 'var(--panel)' }}>
            <h2 className="text-[16px] font-normal mb-6" style={{ color: 'var(--text)' }}>Sign in</h2>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg text-[14px] transition-all login-input" />
              </div>

              <div className="mb-5">
                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg text-[14px] transition-all login-input" />
              </div>

              {error && (
                <div className="mb-4 px-3 py-2.5 rounded-lg text-[13px] flex items-center gap-2 animate-shake" style={{ background: 'rgba(234,67,53,0.1)', color: 'var(--danger)' }}>
                  <span>⚠</span>{error}
                </div>
              )}

              <button type="submit" disabled={loading || !username || !password}
                className="w-full py-3 rounded-lg text-[14px] font-medium transition-all disabled:opacity-40 hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-2"
                style={{ background: 'var(--accent)', color: '#fff' }}>
                {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {loading ? 'Signing in...' : 'Next'}
              </button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-[13px] mt-6" style={{ color: 'var(--text-secondary)' }}>
            Powered by WAHA + Elysia
          </p>
        </div>
      </div>
    </div>
  );
}
