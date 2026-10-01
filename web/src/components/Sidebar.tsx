import { useEffect, useRef, useState } from 'react';
import { chatStore } from '../stores/chatStore';
import { uiStore } from '../stores/uiStore';
import { authStore } from "../stores/authStore";
import { sessionStore } from "../stores/sessionStore";
import Avatar from './Avatar';
import FilterButtons from './FilterButtons';

type TabType = 'chats' | 'status' | 'calls';

export default function Sidebar() {
  const { chats, currentChat } = chatStore();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('chats');
  const [activeFilter, setActiveFilter] = useState('All');
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const openModal = uiStore((s) => s.openModal);
  const logout = authStore((s) => s.logout);
  const sessionState = sessionStore((s) => s.state);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    if (showMenu) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showMenu]);

  const filtered = chats.filter((c) => {
    const matchSearch = search
      ? (c.name || c.chat_jid).toLowerCase().includes(search.toLowerCase())
      : true;
    const matchFilter =
      activeFilter === 'All' ? true :
      activeFilter === 'Unread' ? (c.unread_count ?? 0) > 0 :
      activeFilter === 'Groups' ? c.chat_type === 'group' : true;
    return matchSearch && matchFilter;
  });

  const callChats = chats.filter((c) =>
    (c.last_message_preview || '').includes('Panggilan') ||
    (c.last_message_preview || '').includes('📞') ||
    (c.last_message_preview || '').includes('📹')
  );

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
          <button onClick={() => openModal('newChat')} className="btn-icon" style={{ color: 'var(--text-secondary)' }} title="New chat" aria-label="New chat">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          </button>
          <button onClick={() => openModal('connect')} className="btn-icon relative" style={{ color: sessionState === 'WORKING' ? 'var(--accent)' : 'var(--text-secondary)' }} title="Connect WhatsApp" aria-label="Connect WhatsApp">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
            {sessionState === 'WORKING' && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full" style={{ background: 'var(--accent)', border: '2px solid var(--panel)' }} />}
          </button>
          <div className="relative" ref={menuRef}>
            <button onClick={() => setShowMenu((v) => !v)} className="btn-icon" style={{ color: 'var(--text-secondary)' }} title="Menu" aria-label="Menu" aria-expanded={showMenu}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
            </button>
            {showMenu && (
              <div className="menu-dropdown">
                <button className="menu-item" onClick={() => { setShowMenu(false); openModal('newChat'); }}>New group</button>
                <button className="menu-item" onClick={() => { setShowMenu(false); openModal('starred'); }}>Starred messages</button>
                <button className="menu-item" onClick={() => { setShowMenu(false); openModal('archived'); }}>Archived</button>
                <button className="menu-item" onClick={() => { setShowMenu(false); }}>Select chats</button>
                <button className="menu-item" onClick={() => { setShowMenu(false); }}>Mute notifications</button>
                <div className="menu-divider" />
                <button className="menu-item" onClick={() => { setShowMenu(false); openModal('settings'); }}>Settings</button>
                <button className="menu-item menu-item-danger" onClick={() => { setShowMenu(false); logout(); }}>Log out</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="sidebar-search">
        <div className="sidebar-search-inner">
          <svg className="sidebar-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="var(--text-secondary)">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input
            type="text"
            className="sidebar-search-input"
            placeholder="Search or start new chat"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="sidebar-search-clear" onClick={() => setSearch('')} aria-label="Clear search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* Filter + Tabs row */}
      {activeTab === 'chats' && (
        <FilterButtons active={activeFilter} onChange={setActiveFilter} />
      )}

      <div className="chat-tabs">
        <button className={`chat-tab ${activeTab === 'chats' ? 'active' : ''}`} onClick={() => setActiveTab('chats')}>Chats</button>
        <button className={`chat-tab ${activeTab === 'status' ? 'active' : ''}`} onClick={() => setActiveTab('status')}>Status</button>
        <button className={`chat-tab ${activeTab === 'calls' ? 'active' : ''}`} onClick={() => setActiveTab('calls')}>Calls</button>
      </div>

      {/* Chat list */}
      <div className="chat-list">
        {activeTab === 'chats' ? (
          filtered.length === 0 ? (
            <div className="chat-list-empty">
              <div className="chat-list-empty-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>
              </div>
              <div className="chat-list-empty-title">
                {search ? 'No chats found' : 'No conversations yet'}
              </div>
              <div className="chat-list-empty-desc">
                {search ? `No results for "${search}"` : 'Start a new chat to begin messaging'}
              </div>
            </div>
          ) : (
            filtered.map((chat) => {
              const isActive = currentChat === chat.chat_jid;
              return (
                <div
                  key={chat.chat_jid}
                  onClick={() => chatStore.getState().selectChat(chat.chat_jid)}
                  className={`chat-item ${isActive ? 'chat-item-active' : ''}`}
                >
                  <Avatar name={chat.name || chat.chat_jid} size="md" />
                  <div className="chat-item-body">
                    <div className="chat-item-top">
                      <span className="chat-item-name">{chat.name || chat.chat_jid}</span>
                      <span className={`chat-item-time ${chat.unread_count > 0 ? 'chat-item-time-unread' : ''}`}>
                        {chat.last_message_at
                          ? new Date(chat.last_message_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                          : ''}
                      </span>
                    </div>
                    <div className="chat-item-bottom">
                      <span className="chat-item-preview">
                        {chat.is_muted && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="opacity-60"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.34 8.62C8.5 12.32 12 15.5 12 15.5l4.73-4.73L19 13l1.27-1.27L4.27 3zM12 4L4.27 3z"/></svg>
                        )}
                        {chat.last_message_preview || 'No messages yet'}
                      </span>
                      {chat.unread_count > 0 && (
                        <span className="chat-item-badge">
                          {chat.unread_count > 99 ? '99+' : chat.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )
        ) : activeTab === 'calls' ? (
          callChats.length === 0 ? (
            <div className="chat-list-empty">
              <div className="chat-list-empty-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>
              </div>
              <div className="chat-list-empty-title">No recent calls</div>
              <div className="chat-list-empty-desc">Missed calls will appear here</div>
            </div>
          ) : (
            callChats.map((chat) => (
              <div
                key={chat.chat_jid}
                onClick={() => chatStore.getState().selectChat(chat.chat_jid)}
                className={`chat-item ${currentChat === chat.chat_jid ? 'chat-item-active' : ''}`}
              >
                <Avatar name={chat.name || chat.chat_jid} size="md" />
                <div className="chat-item-body">
                  <div className="chat-item-top">
                    <span className="chat-item-name">{chat.name || chat.chat_jid}</span>
                    <span className="chat-item-time">
                      {chat.last_message_at
                        ? new Date(chat.last_message_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                        : ''}
                    </span>
                  </div>
                  <div className="chat-item-bottom">
                    <span className="chat-item-preview">{chat.last_message_preview}</span>
                  </div>
                </div>
              </div>
            ))
          )
        ) : (
          <div className="tab-empty">No status updates</div>
        )}
      </div>
    </div>
  );
}