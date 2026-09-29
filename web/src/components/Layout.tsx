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
    <div className="h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* Sidebar */}
      <div className="w-[300px] min-w-[300px] flex flex-col border-r" style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}>
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: sessionState === 'WORKING' ? 'var(--accent)' : '#ef4444' }}
            />
            <span className="text-sm font-medium">{user?.username}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => openModal('newChat')} className="px-2 py-1 text-xs rounded" style={{ color: 'var(--text-secondary)' }}>New</button>
            <button onClick={() => openModal('settings')} className="px-2 py-1 text-xs rounded" style={{ color: 'var(--text-secondary)' }}>⚙</button>
            {user?.role === 'admin' && (
              <button onClick={() => openModal('users')} className="px-2 py-1 text-xs rounded" style={{ color: 'var(--text-secondary)' }}>Users</button>
            )}
            <button onClick={logout} className="px-2 py-1 text-xs rounded" style={{ color: 'var(--text-secondary)' }}>Logout</button>
          </div>
        </div>

        {/* Chat list via Sidebar */}
        <Sidebar />
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {currentChat ? (
          <ChatArea />
        ) : (
          <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-secondary)' }}>
            <div className="text-center">
              <div className="text-4xl mb-2">💬</div>
              <div className="text-sm">Select a chat to start messaging</div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {activeModal === 'settings' && <SettingsModal />}
      {activeModal === 'users' && <UserModal />}
      {activeModal === 'newChat' && <NewChatModal />}
      {activeModal === 'groupDrawer' && <GroupDrawer />}
      {activeModal === 'mediaViewer' && <MediaViewer />}
    </div>
  );
}
