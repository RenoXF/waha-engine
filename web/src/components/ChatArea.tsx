import { useEffect, useRef, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { chatStore, Message } from '../stores/chatStore';
import { api } from '../api/client';

function formatTime(ts: string) {
  const d = new Date(ts);
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function MessageBubble({ msg }: { msg: Message }) {
  const [showActions, setShowActions] = useState(false);

  if (msg.is_deleted) {
    return (
      <div className="flex justify-center py-1">
        <div className="text-xs italic px-3 py-1 rounded" style={{ color: 'var(--text-secondary)' }}>
          Pesan ini dihapus
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex ${msg.from_me ? 'justify-end' : 'justify-start'} mb-1 px-4`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div
        className="max-w-[65%] px-3 py-1.5 rounded-lg relative"
        style={{
          background: msg.from_me ? 'var(--bubble-out)' : 'var(--bubble-in)',
          borderTopRightRadius: msg.from_me ? '4px' : undefined,
          borderTopLeftRadius: !msg.from_me ? '4px' : undefined,
        }}
      >
        {msg.quoted_id && (
          <div className="text-xs px-2 py-1 mb-1 rounded border-l-2" style={{ borderColor: 'var(--accent)', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.2)' }}>
            Reply
          </div>
        )}

        {msg.message_type !== 'text' && msg.message_type !== 'reaction' && (
          <div className="text-xs mb-1 px-2 py-1 rounded" style={{ background: 'rgba(0,0,0,0.2)', color: 'var(--text-secondary)' }}>
            📎 [{msg.message_type}]
          </div>
        )}

        <div className="text-sm break-words" style={{ color: 'var(--text)' }}>
          {msg.body || (msg.is_deleted ? 'Pesan ini dihapus' : '[No content]')}
        </div>

        <div className="flex items-center justify-end gap-1 mt-0.5">
          {msg.is_edited && (
            <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Diedit</span>
          )}
          <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {formatTime(msg.wa_timestamp)}
          </span>
          {msg.from_me && (
            <span className="text-[10px]" style={{ color: 'var(--tick-read)' }}>✓✓</span>
          )}
        </div>

        {showActions && (
          <div className="absolute -top-8 right-0 flex gap-1 px-1 py-0.5 rounded text-xs" style={{ background: 'var(--panel-hover)' }}>
            <button
              onClick={() => api.reactMessage(msg.id, msg.chat_jid, '👍').catch(() => {})}
              className="hover:opacity-80"
            >
              👍
            </button>
            <button
              onClick={() => {
                const reply = prompt('Reply:');
                if (reply) api.sendReply(msg.chat_jid, reply, msg.id).catch(() => {});
              }}
              className="hover:opacity-80"
            >
              ↩
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

  const handleSend = async () => {
    if (!input.trim() || !currentChat || sending) return;
    setSending(true);
    const text = input;
    setInput('');
    try {
      await api.sendText(currentChat, text);
    } catch (err) {
      setInput(text);
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-2 flex items-center gap-3" style={{ background: 'var(--panel)', borderBottom: '1px solid var(--border)' }}>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs"
          style={{ background: 'var(--border)' }}
        >
          {(currentChat || '').slice(0, 2).toUpperCase()}
        </div>
        <span className="text-sm font-medium">{currentChat}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="h-full flex items-center justify-center" style={{ color: 'var(--text-secondary)' }}>
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center" style={{ color: 'var(--text-secondary)' }}>
            <div className="text-center">
              <div className="text-3xl mb-2">💬</div>
              <div className="text-sm">No messages yet</div>
            </div>
          </div>
        ) : (
          <Virtuoso
            data={messages}
            itemContent={(_, msg) => <MessageBubble msg={msg} />}
            followOutput="auto"
            initialTopMostItemIndex={messages.length - 1}
            style={{ height: '100%' }}
          />
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-2 flex items-center gap-2" style={{ background: 'var(--panel)', borderTop: '1px solid var(--border)' }}>
        <input
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: 'var(--panel-hover)', color: 'var(--text)' }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
          style={{ background: input.trim() ? 'var(--accent)' : 'var(--panel-hover)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
