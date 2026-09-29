interface TypingIndicatorProps {
  name: string;
}

export default function TypingIndicator({ name }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-1">
      <span className="text-xs" style={{ color: 'var(--accent)' }}>{name}</span>
      <div className="flex gap-0.5">
        <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--accent)', animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
