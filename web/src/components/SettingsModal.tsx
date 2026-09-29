import { uiStore } from '../stores/uiStore';

export default function SettingsModal() {
  const closeModal = uiStore((s) => s.closeModal);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeModal}>
      <div className="w-96 rounded-lg overflow-hidden" style={{ background: 'var(--panel)' }} onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="font-medium">Settings</span>
          <button onClick={closeModal} className="text-lg" style={{ color: 'var(--text-secondary)' }}>✕</button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Session</div>
            <div className="text-sm">NOWEB Engine (Baileys)</div>
          </div>
          <div>
            <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Media Storage</div>
            <div className="text-sm">Local (Media/)</div>
          </div>
          <div>
            <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Retention</div>
            <div className="text-sm">90 days</div>
          </div>
        </div>
      </div>
    </div>
  );
}
