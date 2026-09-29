interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-[42px] h-[42px] text-sm', lg: 'w-12 h-12 text-base' };

const gradients = [
  'linear-gradient(135deg, #00a884, #00b894)',
  'linear-gradient(135deg, #53bdeb, #3498db)',
  'linear-gradient(135deg, #e77c7c, #e74c3c)',
  'linear-gradient(135deg, #7bc862, #27ae60)',
  'linear-gradient(135deg, #e0a526, #f39c12)',
  'linear-gradient(135deg, #6c5ce7, #a29bfe)',
  'linear-gradient(135deg, #fd79a8, #e84393)',
  'linear-gradient(135deg, #00cec9, #0984e3)',
];

function getGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return gradients[Math.abs(hash) % gradients.length];
}

export default function Avatar({ name, src, size = 'md' }: AvatarProps) {
  if (src) return <img src={src} alt={name} className={`${sizes[size]} rounded-full object-cover flex-shrink-0 ring-1 ring-white/10`} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />;
  return (
    <div className={`${sizes[size]} rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 ring-1 ring-white/10`}
      style={{ background: getGradient(name), boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
      {(name || '?').slice(0, 2).toUpperCase()}
    </div>
  );
}
