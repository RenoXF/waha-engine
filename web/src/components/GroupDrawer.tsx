import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { uiStore } from '../stores/uiStore';
import Avatar from './Avatar';

interface Participant {
  participant_jid: string;
  is_admin: boolean;
  push_name: string | null;
  avatar_path: string | null;
}

export default function GroupDrawer() {
  const closeModal = uiStore((s) => s.closeModal);
  const data = uiStore((s) => s.modalData) as { groupId: string; name: string } | null;
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!data?.groupId) return;
    api.getGroupParticipants(data.groupId)
      .then(({ data: p }) => { setParticipants(p); setLoading(false); })
      .catch(() => setLoading(false));
  }, [data?.groupId]);

  if (!data) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-end z-50" onClick={closeModal}>
      <div
        className="w-80 h-full overflow-y-auto"
        style={{ background: 'var(--panel)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <button onClick={closeModal} style={{ color: 'var(--text-secondary)' }}>←</button>
          <span className="font-medium">Group Info</span>
        </div>

        {/* Group name */}
        <div className="px-4 py-6 text-center border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl" style={{ background: 'var(--border)' }}>
            👥
          </div>
          <div className="font-medium">{data.name}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            {participants.length} participants
          </div>
        </div>

        {/* Participants */}
        <div className="px-4 py-2">
          <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            Participants ({participants.length})
          </div>

          {loading ? (
            <div className="text-center text-sm py-4" style={{ color: 'var(--text-secondary)' }}>Loading...</div>
          ) : participants.length === 0 ? (
            <div className="text-center text-sm py-4" style={{ color: 'var(--text-secondary)' }}>No participants</div>
          ) : (
            participants.map((p) => (
              <div key={p.participant_jid} className="flex items-center gap-3 py-2">
                <Avatar name={p.push_name || p.participant_jid} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{p.push_name || p.participant_jid}</div>
                  {p.is_admin && (
                    <span className="text-[10px] px-1 rounded" style={{ background: 'var(--accent)', color: '#fff' }}>Admin</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
