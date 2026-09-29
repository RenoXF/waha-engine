import { uiStore } from '../stores/uiStore';
import { authStore } from '../stores/authStore';

export default function IconStrip() {
  const openModal = uiStore((s) => s.openModal);
  const user = authStore((s) => s.user);

  return (
    <div className="w-[56px] min-w-[56px] flex flex-col items-center py-3 justify-between" style={{ background: 'var(--panel-deep)', borderRight: '1px solid var(--border)' }}>
      <div className="flex flex-col items-center gap-1">
        <button title="Chats" aria-label="Chats" className="w-10 h-10 rounded-xl flex items-center justify-center relative" style={{ background: 'var(--panel-hover)', color: 'var(--text)' }}>
          <span className="absolute -left-[10px] top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-full" style={{ background: 'var(--accent)' }} />
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
        </button>
        <button title="Contacts" aria-label="Contacts" className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/[0.06] transition-colors" style={{ color: 'var(--text-secondary)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
        </button>
        <button title="Status" aria-label="Status" className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/[0.06] transition-colors" style={{ color: 'var(--text-secondary)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
        </button>
        <button title="Starred" aria-label="Starred" className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/[0.06] transition-colors" style={{ color: 'var(--text-secondary)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z"/></svg>
        </button>
      </div>
      <div className="flex flex-col items-center gap-1">
        <button onClick={() => openModal('newChat')} title="New chat" aria-label="New chat" className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/[0.06] transition-colors" style={{ color: 'var(--text-secondary)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
        </button>
        <button onClick={() => openModal('settings')} title="Settings" aria-label="Settings" className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/[0.06] transition-colors" style={{ color: 'var(--text-secondary)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
        </button>
        {user?.role === 'admin' && (
          <button onClick={() => openModal('users')} title="Users" aria-label="Users" className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/[0.06] transition-colors" style={{ color: 'var(--text-secondary)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
          </button>
        )}
        <div className="relative mt-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold ring-2 ring-white/10"
            style={{ background: 'linear-gradient(135deg, var(--accent), #00b894)', color: '#fff' }}>
            {(user?.username || '?').slice(0, 2).toUpperCase()}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2" style={{ background: 'var(--accent)', borderColor: 'var(--panel-deep)' }} />
        </div>
      </div>
    </div>
  );
}
