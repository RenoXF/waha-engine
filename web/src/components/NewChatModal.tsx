import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { contactStore, Contact } from '../stores/contactStore';
import { chatStore } from '../stores/chatStore';
import { uiStore } from '../stores/uiStore';
import Avatar from './Avatar';

export default function NewChatModal() {
  const closeModal = uiStore((s) => s.closeModal);
  const { contacts, loadContacts } = contactStore();
  const [search, setSearch] = useState('');

  useEffect(() => { loadContacts(); }, [loadContacts]);

  const filtered = search
    ? contacts.filter(c => (c.push_name || c.phone || c.jid).toLowerCase().includes(search.toLowerCase()))
    : contacts;

  const handleSelect = (jid: string) => {
    chatStore.getState().selectChat(jid);
    closeModal();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeModal}>
      <div className="w-96 max-h-[80vh] rounded-lg overflow-hidden" style={{ background: 'var(--panel)' }} onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="font-medium">New Chat</span>
          <button onClick={closeModal} className="text-lg" style={{ color: 'var(--text-secondary)' }}>✕</button>
        </div>

        <div className="px-3 py-2">
          <input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-1.5 text-sm rounded outline-none"
            style={{ background: 'var(--panel-hover)', color: 'var(--text)' }}
            autoFocus
          />
        </div>

        <div className="max-h-96 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center text-sm py-4" style={{ color: 'var(--text-secondary)' }}>No contacts found</div>
          ) : (
            filtered.map((c) => (
              <div
                key={c.jid}
                onClick={() => handleSelect(c.jid)}
                className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-white/5"
              >
                <Avatar name={c.push_name || c.phone || c.jid} />
                <div>
                  <div className="text-sm font-medium">{c.push_name || c.phone || c.jid}</div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{c.jid}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
