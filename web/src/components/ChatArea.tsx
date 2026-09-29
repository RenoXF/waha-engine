import { useRef, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { chatStore, Message } from '../stores/chatStore';
import { api } from '../api/client';
import Avatar from './Avatar';
import EmojiPicker from './EmojiPicker';

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts: string) {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function DatePill({ date }: { date: string }) {
  return (
    <div className="flex justify-center py-2">
      <div className="px-3 py-1 rounded-lg text-[11px] font-medium" style={{ background: 'rgba(0,0,0,0.35)', color: 'var(--text-secondary)', backdropFilter: 'blur(4px)' }}>
        {formatDate(date)}
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const [showActions, setShowActions] = useState(false);

  if (msg.is_deleted) {
    return (
      <div className="flex justify-center py-1 px-4">
        <div className="flex items-center gap-1.5 text-[12px] italic px-3 py-1 rounded-lg" style={{ color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.15)' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          Pesan ini dihapus
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${msg.from_me ? 'justify-end' : 'justify-start'} mb-0.5 px-[68px]`}
      onMouseEnter={() => setShowActions(true)} onMouseLeave={() => setShowActions(false)}>
      <div className="relative group max-w-[65%]">
        <div className="px-2.5 py-1.5 rounded-lg" style={{
          background: msg.from_me ? 'var(--bubble-out)' : 'var(--bubble-in)',
          boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
          borderTopRightRadius: msg.from_me ? '4px' : '8px',
          borderTopLeftRadius: !msg.from_me ? '4px' : '8px',
        }}>
          {msg.quoted_id && (
            <div className="text-[11px] px-2 py-1 mb-1 rounded border-l-[3px]" style={{ borderColor: 'var(--accent)', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.15)' }}>
              Reply
            </div>
          )}
          {msg.message_type !== 'text' && msg.message_type !== 'reaction' && (
            <div className="text-[11px] mb-1 px-2 py-1 rounded flex items-center gap-1" style={{ background: 'rgba(0,0,0,0.15)', color: 'var(--text-secondary)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>
              [{msg.message_type}]
            </div>
          )}
          <span className="text-[13.5px] leading-[19px] break-words whitespace-pre-wrap" style={{ color: 'var(--text)' }}>
            {msg.body || '[No content]'}
          </span>
          <span className="float-right ml-2 mt-1 flex items-center gap-1 relative -bottom-0.5">
            {msg.is_edited && <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>edited</span>}
            <span className="text-[10.5px]" style={{ color: 'rgba(255,255,255,0.6)' }}>{formatTime(msg.wa_timestamp)}</span>
            {msg.from_me && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill={msg.from_me ? 'var(--tick-read)' : 'var(--tick-sent)'}>
                <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/>
              </svg>
            )}
          </span>
        </div>

        {/* Action bar */}
        {showActions && (
          <div className="absolute -top-9 right-0 flex items-center gap-0.5 px-1 py-1 rounded-lg animate-fade-in z-10"
            style={{ background: 'var(--panel)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', border: '1px solid var(--border)' }}>
            <button onClick={() => api.reactMessage(msg.id, msg.chat_jid, '👍').catch(() => {})}
              className="w-7 h-7 rounded-md flex items-center justify-center text-sm hover:bg-white/5 transition-colors">👍</button>
            <button onClick={() => { const r = prompt('Reply:'); if (r) api.sendReply(msg.chat_jid, r, msg.id).catch(() => {}); }}
              className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/5 transition-colors" style={{ color: 'var(--text-secondary)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatArea() {
  const { messages, currentChat, loading } = chatStore();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || !currentChat || sending) return;
    setSending(true);
    const text = input;
    setInput('');
    try { await api.sendText(currentChat, text); }
    catch (err) { setInput(text); console.error(err); }
    finally { setSending(false); }
  };

  // Group messages by date
  let lastDate = '';

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Chat Header */}
      <div className="px-4 py-2 flex items-center gap-3" style={{ background: 'var(--panel)', borderBottom: '1px solid var(--border)' }}>
        <Avatar name={currentChat || ''} />
        <div className="flex-1">
          <div className="text-[13px] font-medium">{currentChat}</div>
          <div className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>online</div>
        </div>
        <div className="flex items-center gap-0.5">
          <button className="btn-icon" style={{ color: 'var(--text-secondary)' }} title="Video call">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
          </button>
          <button className="btn-icon" style={{ color: 'var(--text-secondary)' }} title="Voice call">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56-.35-.12-.74-.03-1.01.24l-1.57 1.97c-2.83-1.35-5.48-3.9-6.89-6.83l1.95-1.66c.27-.28.35-.67.24-1.02-.37-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.73 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"/></svg>
          </button>
          <button className="btn-icon" style={{ color: 'var(--text-secondary)' }} title="Search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
          </button>
          <button className="btn-icon" style={{ color: 'var(--text-secondary)' }} title="Menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden chat-bg">
        {loading ? (
          <div className="h-full flex items-center justify-center" style={{ color: 'var(--text-secondary)' }}>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} /> Loading...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center px-4 py-6 rounded-2xl" style={{ background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(4px)' }}>
              <svg className="mx-auto mb-2 opacity-30" width="48" height="48" viewBox="0 0 24 24" fill="var(--text)"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
              <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No messages yet</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Start the conversation</div>
            </div>
          </div>
        ) : (
          <Virtuoso
            data={messages}
            itemContent={(_, msg) => {
              const msgDate = new Date(msg.wa_timestamp).toDateString();
              let showDate = false;
              if (msgDate !== lastDate) { showDate = true; lastDate = msgDate; }
              return (<>{showDate && <DatePill date={msg.wa_timestamp} />}<MessageBubble msg={msg} /></>);
            }}
            followOutput="smooth"
            initialTopMostItemIndex={messages.length - 1}
            style={{ height: '100%' }}
          />
        )}
      </div>

      {/* Input Area */}
      <div className="px-4 py-2.5 flex items-end gap-2" style={{ background: 'var(--panel)', borderTop: '1px solid var(--border)' }}>
        <button className="btn-icon" style={{ color: 'var(--text-secondary)' }} title="Attach">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
        </button>
        <div className="relative">
          <button onClick={() => setShowEmoji(!showEmoji)} className="btn-icon" style={{ color: 'var(--text-secondary)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>
          </button>
          {showEmoji && <EmojiPicker onSelect={(e) => setInput(p => p + e)} onClose={() => setShowEmoji(false)} />}
        </div>
        <div className="flex-1">
          <textarea placeholder="Type a message" value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            rows={1} className="w-full px-3 py-2 rounded-xl text-[13px] resize-none" style={{ background: 'var(--panel-hover)', color: 'var(--text)', minHeight: '36px', maxHeight: '120px' }} />
        </div>
        <button onClick={handleSend} disabled={!input.trim() || sending}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 disabled:opacity-30"
          style={{ background: input.trim() ? 'var(--accent)' : 'transparent', color: input.trim() ? '#fff' : 'var(--text-secondary)' }}>
          {input.trim() ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
          )}
        </button>
      </div>
    </div>
  );
}
