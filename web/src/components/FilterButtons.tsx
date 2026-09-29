interface FilterButtonsProps {
  active: string;
  onChange: (filter: string) => void;
}

const filters = ['All', 'Unread', 'Read'];

export default function FilterButtons({ active, onChange }: FilterButtonsProps) {
  return (
    <div className="flex gap-1 px-3 py-2">
      {filters.map((f) => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
          style={{
            background: active === f ? 'var(--accent)' : 'var(--panel-hover)',
            color: active === f ? '#fff' : 'var(--text-secondary)',
          }}
        >
          {f}
        </button>
      ))}
    </div>
  );
}
