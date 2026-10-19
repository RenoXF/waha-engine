import { chatStore } from '../stores/chatStore';
import { uiStore } from '../stores/uiStore';
import Avatar from './Avatar';

export default function ArchivedChats() {
  const closeModal = uiStore((s) => s.closeModal);
  const { chats } = chatStore();
  const archived = chats.filter((c) => c.is_archived);
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeModal}>
      <div className="w-[420px] max-h-[75vh] rounded-2xl overflow-hidden glass elevated flex flex-col" style={{ background: 'rgba(32,44,51,0.96)', border: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-[15px] font-semibold">Archived</span>
          <button onClick={closeModal} className="btn-icon w-8 h-8" style={{ color: 'var(--text-secondary)' }} aria-label="Close">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {archived.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: 'var(--panel-hover)', border: '1px solid var(--border)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--text-secondary)" className="opacity-60"><path d="M20.5 5H19V3c0-.55-.45-1-1-1H6c-.55 0-1 .45-1 1v2H3.5c-.83 0-1.5.67-1.5 1.5S2.67 8 3.5 8H5v10c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V8h1.5c.83 0 1.5-.67 1.5-1.5S21.33 5 20.5 5zM7 5h10v2H7V5zm10 13H7V8h10v10z"/></svg>
              </div>
              <div className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>No archived chats</div>
              <div className="text-[12px] mt-1" style={{ color: 'var(--text-secondary)' }}>Archived chats will appear here</div>
            </div>
          ) : (
            <div className="space-y-0.5">
              {archived.map((c) => (
                <div key={c.chat_jid} onClick={() => { chatStore.getState().selectChat(c.chat_jid); closeModal(); }} className="px-3 py-2.5 flex items-center gap-3 cursor-pointer rounded-xl hover:bg-white/[0.04] transition-colors">
                  <Avatar name={c.name || c.chat_jid} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-medium truncate">{c.name || c.chat_jid}</div>
                    <div className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>{c.last_message_preview || 'No messages yet'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
