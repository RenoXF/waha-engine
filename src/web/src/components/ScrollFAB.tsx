interface ScrollFABProps {
  onClick: () => void;
  show: boolean;
  unreadCount?: number;
}

export default function ScrollFAB({ onClick, show, unreadCount }: ScrollFABProps) {
  if (!show) return null;

  return (
    <button
      onClick={onClick}
      className="absolute bottom-20 right-4 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all z-10"
      style={{ background: 'var(--panel)', color: 'var(--text-secondary)' }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
      </svg>
      {unreadCount && unreadCount > 0 && (
        <span
          className="absolute -top-1 -right-1 text-[10px] px-1 py-0.5 rounded-full min-w-[16px] text-center"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          {unreadCount}
        </span>
      )}
    </button>
  );
}
