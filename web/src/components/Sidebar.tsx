import { useState } from 'react';
import { chatStore } from '../stores/chatStore';
import Avatar from './Avatar';
import FilterButtons from './FilterButtons';

export default function Sidebar() {
  const { chats, currentChat } = chatStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  let filtered = search
    ? chats.filter(c => (c.name || c.chat_jid).toLowerCase().includes(search.toLowerCase()))
    : chats;
  if (filter === 'Unread') filtered = filtered.filter(c => c.unread_count > 0);
  if (filter === 'Read') filtered = filtered.filter(c => c.unread_count === 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Search */}
      <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="var(--text-secondary)">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input type="text" placeholder="Search or start new chat" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg text-sm" style={{ background: 'var(--panel-hover)', color: 'var(--text)' }} />
        </div>
      </div>

      <FilterButtons active={filter} onChange={setFilter} />

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
            <svg className="mx-auto mb-2 opacity-30" width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
            </svg>
            <div className="text-sm">{search ? 'No chats found' : 'No conversations yet'}</div>
          </div>
        ) : (
          filtered.map((chat, i) => (
            <div key={chat.chat_jid} onClick={() => chatStore.getState().selectChat(chat.chat_jid)}
              className="px-3 py-3 cursor-pointer flex items-center gap-3 transition-colors"
              style={{
                background: currentChat === chat.chat_jid ? 'var(--panel-hover)' : 'transparent',
                borderBottom: '1px solid var(--border)',
                animationDelay: `${i * 20}ms`,
              }}
              onMouseEnter={(e) => { if (currentChat !== chat.chat_jid) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
              onMouseLeave={(e) => { if (currentChat !== chat.chat_jid) e.currentTarget.style.background = 'transparent'; }}>
              <Avatar name={chat.name || chat.chat_jid} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium truncate" style={{ color: 'var(--text)' }}>
                    {chat.name || chat.chat_jid}
                  </span>
                  <span className="text-[11px] ml-2 flex-shrink-0" style={{ color: chat.unread_count > 0 ? 'var(--accent)' : 'var(--text-secondary)' }}>
                    {chat.last_message_at ? new Date(chat.last_message_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[12px] truncate" style={{ color: 'var(--text-secondary)' }}>
                    {chat.last_message_preview || 'No messages yet'}
                  </span>
                  {chat.unread_count > 0 && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full ml-2 flex-shrink-0"
                      style={{ background: 'var(--accent)', color: '#fff', minWidth: '18px', textAlign: 'center' }}>
                      {chat.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
