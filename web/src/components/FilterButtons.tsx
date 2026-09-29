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
          className="px-3.5 py-1.5 rounded-full text-[11px] font-medium transition-all active:scale-[0.97]"
          style={{
            background: active === f ? 'var(--accent)' : 'var(--panel-hover)',
            color: active === f ? '#fff' : 'var(--text-secondary)',
            boxShadow: active === f ? '0 2px 8px rgba(0,168,132,0.35)' : 'none',
          }}>
          {f}
        </button>
      ))}
    </div>
  );
}
