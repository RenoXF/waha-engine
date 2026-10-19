import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { uiStore } from '../stores/uiStore';

interface User {
  id: string;
  username: string;
  role: string;
  is_active: boolean;
}

export default function UserModal() {
  const closeModal = uiStore((s) => s.closeModal);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'agent' });
  const [error, setError] = useState('');

  useEffect(() => {
    api.getUsers().then(({ data }) => { setUsers(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!newUser.username || !newUser.password) return;
    try {
      const { data } = await api.createUser(newUser.username, newUser.password, newUser.role) as { data: User };
      setUsers([...users, data]);
      setNewUser({ username: '', password: '', role: 'agent' });
    } catch (err) {
      setError(String(err));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closeModal}>
      <div className="w-96 max-h-[80vh] rounded-lg overflow-hidden" style={{ background: 'var(--panel)' }} onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="font-medium">User Management</span>
          <button onClick={closeModal} className="text-lg" style={{ color: 'var(--text-secondary)' }}>✕</button>
        </div>

        <div className="p-4 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center text-sm py-4" style={{ color: 'var(--text-secondary)' }}>Loading...</div>
          ) : users.length === 0 ? (
            <div className="text-center text-sm py-4" style={{ color: 'var(--text-secondary)' }}>No users</div>
          ) : (
            users.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <div className="text-sm font-medium">{u.username}</div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{u.role}</div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded" style={{ background: u.is_active ? 'var(--accent)' : '#ef4444', color: '#fff' }}>
                  {u.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="text-xs font-medium mb-2">Add User</div>
          <input placeholder="Username" value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
            className="w-full px-2 py-1 mb-2 text-sm rounded" style={{ background: 'var(--panel-hover)', color: 'var(--text)' }} />
          <input placeholder="Password" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            className="w-full px-2 py-1 mb-2 text-sm rounded" style={{ background: 'var(--panel-hover)', color: 'var(--text)' }} />
          <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
            className="w-full px-2 py-1 mb-2 text-sm rounded" style={{ background: 'var(--panel-hover)', color: 'var(--text)' }}>
            <option value="agent">Agent</option>
            <option value="admin">Admin</option>
          </select>
          {error && <div className="text-red-400 text-xs mb-2">{error}</div>}
          <button onClick={handleCreate} className="w-full py-1.5 rounded text-sm" style={{ background: 'var(--accent)', color: '#fff' }}>Add</button>
        </div>
      </div>
    </div>
  );
}
