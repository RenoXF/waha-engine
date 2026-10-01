import { useEffect, useState, useCallback } from 'react';
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

interface StatusViewerProps {
  statuses: StatusItem[];
  initialIndex: number;
  onClose: () => void;
}

export default function StatusViewer({ statuses, initialIndex, onClose }: StatusViewerProps) {
  const [index, setIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const current = statuses[index];

  const goNext = useCallback(() => {
    if (index < statuses.length - 1) {
      setIndex(index + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [index, statuses.length, onClose]);

  const goPrev = useCallback(() => {
    if (index > 0) {
      setIndex(index - 1);
      setProgress(0);
    }
  }, [index]);

  // Auto-advance every 5 seconds
  useEffect(() => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          goNext();
          return 0;
        }
        return p + 2;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [index, goNext]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, goNext, goPrev]);

  if (!current) return null;

  return (
    <div className="status-viewer-overlay" onClick={onClose}>
      <div className="status-viewer" onClick={(e) => e.stopPropagation()}>
        {/* Progress bars */}
        <div className="status-progress-bars">
          {statuses.map((_, i) => (
            <div key={i} className="status-progress-track">
              <div
                className="status-progress-fill"
                style={{ width: i < index ? '100%' : i === index ? `${progress}%` : '0%' }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="status-viewer-header">
          <div className="flex items-center gap-3">
            <Avatar name={current.display_name || current.from_jid} size="sm" />
            <div>
              <div className="text-sm font-medium text-white">{current.display_name || current.from_jid}</div>
              <div className="text-xs text-white/60">
                {new Date(current.wa_timestamp).toLocaleString('id-ID', {
                  day: 'numeric', month: 'long', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="status-close-btn">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="status-viewer-content">
          {current.has_media ? (
            <img
              src={`/files/download/${current.id}`}
              alt="status"
              className="status-viewer-img"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="status-viewer-text">{current.body || 'Status'}</div>
          )}
        </div>

        {/* Navigation arrows */}
        {index > 0 && (
          <button className="status-nav-btn status-nav-prev" onClick={(e) => { e.stopPropagation(); goPrev(); }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
          </button>
        )}
        {index < statuses.length - 1 && (
          <button className="status-nav-btn status-nav-next" onClick={(e) => { e.stopPropagation(); goNext(); }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
          </button>
        )}
      </div>
    </div>
  );
}
