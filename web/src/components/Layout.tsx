import { useEffect } from 'react';
import { chatStore } from '../stores/chatStore';
import { authStore } from '../stores/authStore';
import { sessionStore } from '../stores/sessionStore';
import { uiStore } from '../stores/uiStore';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import SettingsModal from './SettingsModal';
import UserModal from './UserModal';
import NewChatModal from './NewChatModal';
import GroupDrawer from './GroupDrawer';
import MediaViewer from './MediaViewer';

export default function Layout() {
  const currentChat = chatStore((s) => s.currentChat);
  const loadChats = chatStore((s) => s.loadChats);
  const logout = authStore((s) => s.logout);
  const sessionState = sessionStore((s) => s.state);
  const user = authStore((s) => s.user);
  const activeModal = uiStore((s) => s.activeModal);
  const openModal = uiStore((s) => s.openModal);

  useEffect(() => { loadChats(); }, [loadChats]);

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-[340px] min-w-[340px] flex flex-col" style={{ background: 'var(--panel)', borderRight: '1px solid var(--border)' }}>
        {/* Sidebar Header */}
        <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: 'var(--panel-deep)', borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: 'linear-gradient(135deg, var(--accent), #00b894)', color: '#fff' }}>
                {(user?.username || '?').slice(0, 2).toUpperCase()}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2" style={{ borderColor: 'var(--panel-deep)', background: sessionState === 'WORKING' ? 'var(--accent)' : 'var(--danger)' }} />
            </div>
            <div>
              <div className="text-sm font-medium leading-tight">{user?.username}</div>
              <div className="text-[11px] leading-tight" style={{ color: sessionState === 'WORKING' ? 'var(--accent)' : 'var(--danger)' }}>
                {sessionState === 'WORKING' ? 'Connected' : 'Disconnected'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <button onClick={() => openModal('newChat')} className="btn-icon" style={{ color: 'var(--text-secondary)' }} title="New Chat">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
            </button>
            <button onClick={() => openModal('settings')} className="btn-icon" style={{ color: 'var(--text-secondary)' }} title="Settings">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
            </button>
            {user?.role === 'admin' && (
              <button onClick={() => openModal('users')} className="btn-icon" style={{ color: 'var(--text-secondary)' }} title="Users">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
              </button>
            )}
            <button onClick={logout} className="btn-icon" style={{ color: 'var(--text-secondary)' }} title="Logout">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
            </button>
          </div>
        </div>
        <Sidebar />
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {currentChat ? <ChatArea /> : (
          <div className="flex-1 flex items-center justify-center chat-bg">
            <div className="text-center animate-fade-in">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--panel)', boxShadow: 'var(--shadow)' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="var(--text-secondary)"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
              </div>
              <h3 className="text-lg font-light mb-1" style={{ color: 'var(--text)' }}>WAHA Engine</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Send and receive messages</p>
            </div>
          </div>
        )}
      </div>

      {activeModal === 'settings' && <SettingsModal />}
      {activeModal === 'users' && <UserModal />}
      {activeModal === 'newChat' && <NewChatModal />}
      {activeModal === 'groupDrawer' && <GroupDrawer />}
      {activeModal === 'mediaViewer' && <MediaViewer />}
    </div>
  );
}
