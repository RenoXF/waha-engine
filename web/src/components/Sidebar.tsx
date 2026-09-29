import { useState } from 'react';
import { chatStore } from '../stores/chatStore';
import { uiStore } from '../stores/uiStore';
import Avatar from './Avatar';

type TabType = 'chats' | 'status' | 'calls';

export default function Sidebar() {
  const { chats, currentChat } = chatStore();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('chats');
  const openModal = uiStore((s) => s.openModal);

  const filtered = search
    ? chats.filter(c => (c.name || c.chat_jid).toLowerCase().includes(search.toLowerCase()))
    : chats;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="sidebar-header">
        <div className="profile-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--text-secondary)">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
        <span className="header-title">Chats</span>
        <div className="header-actions">
          <button onClick={() => openModal('newChat')} className="btn-icon" style={{ color: 'var(--text-secondary)' }} title="New chat">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          </button>
          <button className="btn-icon" style={{ color: 'var(--text-secondary)' }} title="Menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 py-2" style={{ background: 'var(--panel)', borderBottom: '1px solid var(--border)' }}>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="var(--text-secondary)">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input type="text" placeholder="Search or start new chat" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 rounded-lg text-[13px]" style={{ background: 'var(--panel-hover)', color: 'var(--text)' }} />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="chat-tabs" style={{ background: 'var(--panel)' }}>
        <button className={`chat-tab ${activeTab === 'chats' ? 'active' : ''}`} onClick={() => setActiveTab('chats')}>
          Chats
        </button>
        <button className={`chat-tab ${activeTab === 'status' ? 'active' : ''}`} onClick={() => setActiveTab('status')}>
          Status
        </button>
        <button className={`chat-tab ${activeTab === 'calls' ? 'active' : ''}`} onClick={() => setActiveTab('calls')}>
          Calls
        </button>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto" style={{ background: 'var(--panel)' }}>
        {activeTab === 'chats' ? (
          filtered.length === 0 ? (
            <div className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
              <div className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>
                {search ? 'No chats found' : 'No conversations yet'}
              </div>
              <div className="text-[12px] mt-1">
                {search ? `No results for "${search}"` : 'Start a new chat to begin messaging'}
              </div>
            </div>
          ) : (
            <div>
              {filtered.map((chat) => {
                const active = currentChat === chat.chat_jid;
                return (
                  <div key={chat.chat_jid} onClick={() => chatStore.getState().selectChat(chat.chat_jid)}
                    className="px-3 py-3 cursor-pointer flex items-center gap-3 transition-colors"
                    style={{
                      background: active ? 'var(--panel-hover)' : 'transparent',
                    }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                    <Avatar name={chat.name || chat.chat_jid} size="md" />
                    <div className="flex-1 min-w-0 border-b py-1" style={{ borderColor: 'var(--border)' }}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[15px] truncate" style={{ color: 'var(--text)' }}>
                          {chat.name || chat.chat_jid}
                        </span>
                        <span className="text-[12px] flex-shrink-0" style={{ color: chat.unread_count > 0 ? 'var(--accent)' : 'var(--text-secondary)' }}>
                          {chat.last_message_at ? new Date(chat.last_message_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <span className="text-[13px] truncate flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                          {chat.is_muted && <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="opacity-60"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.34 8.62C8.5 12.32 12 15.5 12 15.5l4.73-4.73L19 13l1.27-1.27L4.27 3zM12 4L4.27 3z"/></svg>}
                          {chat.last_message_preview || 'No messages yet'}
                        </span>
                        {chat.unread_count > 0 ? (
                          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 min-w-[20px] text-center" style={{ background: 'var(--accent)', color: '#fff' }}>
                            {chat.unread_count > 99 ? '99+' : chat.unread_count}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
            <div className="text-[13px]">{activeTab === 'status' ? 'No status updates' : 'No recent calls'}</div>
          </div>
        )}
      </div>
    </div>
  );
}
