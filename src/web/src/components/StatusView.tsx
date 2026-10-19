import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import { uiStore } from '../stores/uiStore';
import Avatar from './Avatar';

interface StatusItem {
  id: string;
  from_jid: string;
  body: string | null;
  message_type: string;
  has_media: boolean;
  media_mime: string | null;
  media_path: string | null;
  wa_timestamp: string;
  display_name: string;
}

export default function StatusView() {
  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getStatuses().then(({ data }) => {
      setStatuses(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const current = statuses[index];

  const goNext = useCallback(() => {
    if (index < statuses.length - 1) {
      setIndex(index + 1);
      setProgress(0);
    } else {
      uiStore.getState().closeModal();
    }
  }, [index, statuses.length]);

  const goPrev = useCallback(() => {
    if (index > 0) {
      setIndex(index - 1);
      setProgress(0);
    }
  }, [index]);

  useEffect(() => {
    if (!current) return;
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 2, 100));
    }, 100);
    return () => clearInterval(interval);
  }, [index, current]);

  // When progress completes, advance or close (outside render)
  useEffect(() => {
    if (progress >= 100) goNext();
  }, [progress, goNext]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') uiStore.getState().closeModal();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [goNext, goPrev]);

  if (loading) {
    return (
      <div className="msg-container">
        <div className="msg-loading">
          <div className="msg-loading-dot" />
          Loading status...
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="msg-container">
        <div className="msg-empty">
          <div className="msg-empty-card">
            <svg className="msg-empty-icon" width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
            </svg>
            <div className="msg-empty-title">No status updates</div>
            <div className="msg-empty-desc">Status from contacts will appear here</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="msg-container" style={{ display: 'flex', flexDirection: 'column', background: '#000' }}>
      {/* Progress bars */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 12px 4px', flexShrink: 0 }}>
        {statuses.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 2.5, borderRadius: 2, background: 'rgba(255,255,255,0.3)', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#fff', transition: 'width 0.1s linear', width: i < index ? '100%' : i === index ? `${progress}%` : '0%' }} />
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar name={current.display_name || current.from_jid} size="md" />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{current.display_name || current.from_jid}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
              {new Date(current.wa_timestamp).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
            {index + 1} / {statuses.length}
          </span>
          <button
            onClick={() => uiStore.getState().closeModal()}
            style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'rgba(255,255,255,0.1)', cursor: 'pointer', color: '#fff' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '0 48px 16px', position: 'relative' }}>
        {current.has_media ? (
          <img
            src={`/files/download/${current.id}`}
            alt="status"
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 8 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div style={{ color: '#fff', fontSize: 22, textAlign: 'center', padding: 24, lineHeight: 1.5 }}>
            {current.body || 'Status'}
          </div>
        )}

        {/* Nav arrows */}
        {index > 0 && (
          <button onClick={goPrev} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'rgba(255,255,255,0.15)', cursor: 'pointer' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
          </button>
        )}
        {index < statuses.length - 1 && (
          <button onClick={goNext} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'rgba(255,255,255,0.15)', cursor: 'pointer' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
          </button>
        )}
      </div>
    </div>
  );
}
