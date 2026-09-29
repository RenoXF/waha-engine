import { uiStore } from '../stores/uiStore';

export default function MediaViewer() {
  const closeModal = uiStore((s) => s.closeModal);
  const data = uiStore((s) => s.modalData) as { src?: string; type?: string; name?: string } | null;

  if (!data) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={closeModal}>
      <div className="max-w-4xl max-h-[90vh] relative" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={closeModal}
          className="absolute -top-10 right-0 text-white text-2xl"
        >
          ✕
        </button>

        {data.type?.startsWith('image/') ? (
          <img src={data.src} alt={data.name} className="max-w-full max-h-[85vh] rounded" />
        ) : data.type?.startsWith('video/') ? (
          <video src={data.src} controls className="max-w-full max-h-[85vh] rounded" />
        ) : data.type?.startsWith('audio/') ? (
          <div className="p-8 rounded" style={{ background: 'var(--panel)' }}>
            <div className="text-center mb-4 text-white">{data.name}</div>
            <audio src={data.src} controls className="w-full" />
          </div>
        ) : (
          <div className="p-8 rounded text-center" style={{ background: 'var(--panel)' }}>
            <div className="text-4xl mb-2">📄</div>
            <div className="text-white mb-4">{data.name}</div>
            <a href={data.src} download className="px-4 py-2 rounded text-sm" style={{ background: 'var(--accent)', color: '#fff' }}>
              Download
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
