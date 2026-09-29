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
      <div className="px-3 py-2">
        <input
          type="text"
          placeholder="Search chats..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-1.5 rounded-md text-sm outline-none"
          style={{ background: 'var(--panel-hover)', color: 'var(--text)' }}
        />
      </div>

      {/* Filter */}
      <FilterButtons active={filter} onChange={setFilter} />

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
            {search ? 'Tidak ditemukan' : filter === 'Unread' ? 'Tidak ada chat unread' : 'Belum ada chat'}
          </div>
        ) : (
          filtered.map((chat) => (
            <div
              key={chat.chat_jid}
              onClick={() => chatStore.getState().selectChat(chat.chat_jid)}
              className="px-4 py-3 cursor-pointer transition-colors flex items-center gap-3"
              style={{
                background: currentChat === chat.chat_jid ? 'var(--panel-hover)' : 'transparent',
              }}
            >
              <Avatar name={chat.name || chat.chat_jid} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                    {chat.name || chat.chat_jid}
                  </span>
                  {chat.last_message_at && (
                    <span className="text-[10px] ml-2" style={{ color: 'var(--text-secondary)' }}>
                      {new Date(chat.last_message_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                    {chat.last_message_preview || 'No messages'}
                  </span>
                  {chat.unread_count > 0 && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center ml-2"
                      style={{ background: 'var(--accent)', color: '#fff' }}
                    >
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
