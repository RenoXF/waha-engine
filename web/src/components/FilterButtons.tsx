interface FilterButtonsProps {
  active: string;
  onChange: (filter: string) => void;
}

const filters = ['All', 'Unread', 'Read'];

export default function FilterButtons({ active, onChange }: FilterButtonsProps) {
  return (
    <div className="flex gap-1.5 px-3 py-2" style={{ borderBottom: '1px solid var(--border)' }}>
      {filters.map((f) => (
        <button key={f} onClick={() => onChange(f)}
          className="px-3 py-1 rounded-full text-[11px] font-medium transition-all"
          style={{
            background: active === f ? 'var(--accent)' : 'var(--panel-hover)',
            color: active === f ? '#fff' : 'var(--text-secondary)',
          }}>
          {f}
        </button>
      ))}
    </div>
  );
}
