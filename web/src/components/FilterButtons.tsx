interface FilterButtonsProps {
  active: string;
  onChange: (filter: string) => void;
}

const filters = ['All', 'Unread', 'Groups'];

export default function FilterButtons({ active, onChange }: FilterButtonsProps) {
  return (
    <div className="filter-bar">
      {filters.map((f) => (
        <button
          key={f}
          onClick={() => onChange(f)}
          className={`filter-btn ${active === f ? 'filter-btn-active' : ''}`}
        >
          {f}
        </button>
      ))}
    </div>
  );
}