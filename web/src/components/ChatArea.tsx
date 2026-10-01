import { useRef, useState, useCallback, useEffect } from 'react';
import { chatStore, Message } from '../stores/chatStore';
import { api } from '../api/client';
import Avatar from './Avatar';
import EmojiPicker from './EmojiPicker';

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(ts: string) {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function DatePill({ date }: { date: string }) {
  return (
    <div className="date-pill">
      <div className="date-pill-inner">{formatDate(date)}</div>
    </div>
  );
}

function TickIcon({ read }: { read: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={read ? 'var(--tick-read)' : 'var(--tick-sent)'}
    >
      <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z" />
    </svg>
  );
}

/* Time that floats inline at end of text (for text & caption messages) */
function FloatMeta({ msg }: { msg: Message }) {
  return (
    <span className="msg-meta">
      {msg.is_edited && <span className="msg-edited">edited</span>}
      <span className="msg-time">{formatTime(msg.wa_timestamp)}</span>
      {msg.from_me && <TickIcon read={!!msg.from_me} />}
    </span>
  );
}

/* Time that overlays on bottom-right of image (for media-only) */
function OverlayMeta({ msg }: { msg: Message }) {
  return (
    <span className="msg-media-overlay">
      {msg.is_edited && <span className="msg-media-overlay-edited">edited</span>}
      <span>{formatTime(msg.wa_timestamp)}</span>
      {msg.from_me && <TickIcon read={!!msg.from_me} />}
    </span>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  if (msg.is_deleted) {
    return (
      <div className="msg-deleted">
        <div className="msg-deleted-inner">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
          </svg>
          Pesan ini dihapus
        </div>
      </div>
    );
  }

  const hasVisualMedia =
    msg.has_media &&
    msg.message_type !== 'text' &&
    msg.message_type !== 'reaction';

  const isNonVisualType =
    !msg.has_media &&
    msg.message_type !== 'text' &&
    msg.message_type !== 'reaction';

  const hasCaption = !!msg.body;
  const isMediaOnly = hasVisualMedia && !hasCaption;

  return (
    <div className={`msg-row ${msg.from_me ? 'msg-row-out' : 'msg-row-in'}`}>
      <div className="msg-bubble-wrap">
        <div
          className={`msg-bubble ${msg.from_me ? 'msg-bubble-out' : 'msg-bubble-in'} ${hasVisualMedia ? 'msg-bubble-media' : ''} ${isMediaOnly ? 'msg-bubble-media-only' : ''}`}
        >
          {msg.quoted_id && <div className="msg-quoted">Reply</div>}

          {/* ── Visual media (image/video with actual file) ── */}
          {hasVisualMedia && (
            <div className="msg-media-container">
              <img
                src={`/files/download/${msg.id}`}
                alt="media"
                className="msg-media-img"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.opacity = '0.3';
                }}
              />
              {isMediaOnly && <OverlayMeta msg={msg} />}
            </div>
          )}

          {/* ── Non-visual type without file (link, document, etc.) ── */}
          {isNonVisualType && !hasCaption && (
            <div className="msg-type-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z" />
              </svg>
              <span>{msg.message_type}</span>
            </div>
          )}

          {/* ── Body text ── */}
          {hasCaption && (
            <span className={`msg-text ${hasVisualMedia ? 'msg-text-caption' : ''}`}>
              {msg.body}
            </span>
          )}

          {/* ── Time ── */}
          {isMediaOnly ? null : <FloatMeta msg={msg} />}
        </div>

        {/* Action bar */}
        <div className="msg-action-bar">
          <button
            className="msg-action-btn"
            onClick={() =>
              api.reactMessage(msg.id, msg.chat_jid, '👍').catch(() => {})
            }
          >
            👍
          </button>
          <button
            className="msg-action-btn"
            onClick={() => {
              const r = prompt('Reply:');
              if (r) api.sendReply(msg.chat_jid, r, msg.id).catch(() => {});
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChatArea() {
  const { messages, currentChat, loading } = chatStore();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLenRef = useRef(0);

  useEffect(() => {
    if (messages.length > prevLenRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevLenRef.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    if (scrollRef.current) {
      requestAnimationFrame(() => {
        if (scrollRef.current)
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      });
    }
  }, [currentChat]);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, []);

  const handleSend = async () => {
    if (!input.trim() || !currentChat || sending) return;
    setSending(true);
    const text = input;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = '42px';
    try {
      await api.sendText(currentChat, text);
    } catch (err) {
      setInput(text);
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const datesRef = useRef<Set<string>>(new Set());
  datesRef.current.clear();

  const hasInput = input.trim().length > 0;

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="chat-header">
        <Avatar name={currentChat || ''} size="md" />
        <div className="chat-header-info">
          <div className="chat-header-name">{currentChat}</div>
          <div className="chat-header-status">tap here for contact info</div>
        </div>
        <div className="chat-header-actions">
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
      <div className="msg-container">
        {loading ? (
          <div className="msg-loading">
            <div className="msg-loading-dot" />
            Loading...
          </div>
        ) : messages.length === 0 ? (
          <div className="msg-empty">
            <div className="msg-empty-card">
              <svg className="msg-empty-icon" width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
              <div className="msg-empty-title">No messages yet</div>
              <div className="msg-empty-desc">Start the conversation</div>
            </div>
          </div>
        ) : (
          <div className="msg-scroll" ref={scrollRef}>
            <div className="encrypt-notice">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM15.1 8H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z"/></svg>
              Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.
            </div>
            {messages.map((msg) => {
              const msgDate = new Date(msg.wa_timestamp).toDateString();
              const showDate = !datesRef.current.has(msgDate);
              if (showDate) datesRef.current.add(msgDate);
              return (
                <div key={msg.id} className="msg-item">
                  {showDate && <DatePill date={msg.wa_timestamp} />}
                  <MessageBubble msg={msg} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="chat-input-bar">
        <div className="relative">
          <button onClick={() => setShowEmoji(!showEmoji)} className="btn-icon" style={{ color: 'var(--text-secondary)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>
          </button>
          {showEmoji && <EmojiPicker onSelect={(e) => setInput((p) => p + e)} onClose={() => setShowEmoji(false)} />}
        </div>
        <div className="chat-input-area">
          <textarea
            ref={textareaRef}
            className="chat-textarea"
            placeholder="Type a message"
            value={input}
            onChange={(e) => { setInput(e.target.value); autoResize(); }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            rows={1}
          />
        </div>
        <button className="btn-icon" style={{ color: 'var(--text-secondary)' }} title="Attach">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg>
        </button>
        <button onClick={handleSend} disabled={!hasInput || sending} className={`send-btn ${hasInput ? 'send-btn-active' : ''}`}>
          {hasInput ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/></svg>
          )}
        </button>
      </div>
    </div>
  );
}