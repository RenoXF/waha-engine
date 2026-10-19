import { chatStore } from '../stores/chatStore';
import { uiStore } from '../stores/uiStore';

export default function StarredMessages() {
  const closeModal = uiStore((s) => s.closeModal);
  const { messages, chats } = chatStore();
  // global starred: filter current messages + ponytail for API
  const starred = messages.filter((m) => m.is_starred);
  // ponytail: replace with GET /messages/starred when backend ready

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeModal}>
      <div className="w-[420px] max-h-[75vh] rounded-2xl overflow-hidden glass elevated flex flex-col" style={{ background: 'rgba(32,44,51,0.96)', border: '1px solid var(--border)' }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-[15px] font-semibold">Starred messages</span>
          <button onClick={closeModal} className="btn-icon w-8 h-8" style={{ color: 'var(--text-secondary)' }} aria-label="Close">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {starred.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: 'var(--panel-hover)', border: '1px solid var(--border)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--text-secondary)" className="opacity-60"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
              </div>
              <div className="text-[13px] font-medium" style={{ color: 'var(--text)' }}>No starred messages</div>
              <div className="text-[12px] mt-1" style={{ color: 'var(--text-secondary)' }}>Star messages to find them quickly</div>
            </div>
          ) : (
            <div className="space-y-1">
              {starred.map((m) => (
                <div key={m.id} onClick={() => { chatStore.getState().selectChat(m.chat_jid); closeModal(); }} className="px-3 py-2.5 rounded-xl cursor-pointer hover:bg-white/[0.04] transition-colors" style={{ border: '1px solid transparent' }}>
                  <div className="text-[12px] font-medium truncate" style={{ color: 'var(--accent)' }}>{chats.find((c) => c.chat_jid === m.chat_jid)?.name || m.chat_jid}</div>
                  <div className="text-[13px] mt-1 line-clamp-2" style={{ color: 'var(--text)' }}>{m.body || `[${m.message_type}]`}</div>
                  <div className="text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>{new Date(m.wa_timestamp).toLocaleString('id-ID')}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
