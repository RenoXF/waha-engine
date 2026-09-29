import { useEffect } from 'react';
import { chatStore } from '../stores/chatStore';
import { uiStore } from '../stores/uiStore';
import IconStrip from './IconStrip';
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
  const activeModal = uiStore((s) => s.activeModal);

  useEffect(() => { loadChats(); }, [loadChats]);

  return (
    <div className="h-screen flex overflow-hidden">
      <IconStrip />
      <div className="w-[340px] min-w-[340px] flex flex-col" style={{ background: 'var(--panel)', borderRight: '1px solid var(--border)' }}>
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col">
        {currentChat ? <ChatArea /> : (
          <div className="flex-1 flex items-center justify-center chat-bg">
            <div className="text-center animate-fade-in">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'var(--panel)', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="var(--text-secondary)"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
              </div>
              <h3 className="text-[15px] font-light mb-1" style={{ color: 'var(--text)' }}>WAHA Engine</h3>
              <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>Send and receive messages</p>
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
