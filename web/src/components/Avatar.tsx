interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

const colors = [
  '#00a884', '#53bdeb', '#e77c7c', '#7bc862', '#e0a526',
  '#6c5ce7', '#fd79a8', '#00cec9', '#fab1a0', '#81ecec',
];

function getColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function Avatar({ name, src, size = 'md' }: AvatarProps) {
  const initials = (name || '?').slice(0, 2).toUpperCase();

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizes[size]} rounded-full object-cover`}
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-medium flex-shrink-0`}
      style={{ background: getColor(name), color: '#fff' }}
    >
      {initials}
    </div>
  );
}
