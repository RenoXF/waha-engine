const BASE = '';

async function request<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (res.status === 401) {
    // Don't reload for auth check — just throw
    if (path === '/auth/me') throw new Error('Unauthorized');
    window.location.reload();
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }

  return res.json();
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),

  // Messages
  getChats: () => request('/messages'),
  searchMessages: (q: string) => request(`/messages/search?q=${encodeURIComponent(q)}`),
  getMessages: (chatJid: string, limit = 50, cursor?: string, cursorId?: string) => {
    let url = `/messages/${chatJid}?limit=${limit}`;
    if (cursor && cursorId) url += `&cursor=${cursor}&cursorId=${cursorId}`;
    return request(url);
  },
  sendText: (recipient: string, message: string) =>
    request('/messages/send-text', { method: 'POST', body: JSON.stringify({ recipient, message }) }),
  sendReply: (recipient: string, message: string, quotedId: string) =>
    request('/messages/send-reply', { method: 'POST', body: JSON.stringify({ recipient, message, quotedId }) }),
  deleteMessage: (messageId: string, chatJid: string) =>
    request('/messages/delete', { method: 'POST', body: JSON.stringify({ messageId, chatJid }) }),
  editMessage: (messageId: string, chatJid: string, message: string) =>
    request('/messages/edit', { method: 'POST', body: JSON.stringify({ messageId, chatJid, message }) }),
  starMessage: (messageId: string, star: boolean) =>
    request('/messages/star', { method: 'POST', body: JSON.stringify({ messageId, star }) }),
  reactMessage: (messageId: string, chatJid: string, emoji: string) =>
    request('/messages/react', { method: 'POST', body: JSON.stringify({ messageId, chatJid, emoji }) }),
  markRead: (chatJid: string) =>
    request('/messages/read', { method: 'POST', body: JSON.stringify({ chatJid }) }),

  // Contacts
  getContacts: () => request('/contacts'),

  // Groups
  getGroups: () => request('/groups'),
  getGroupParticipants: (id: string) => request(`/groups/${id}/participants`),

  // Users
  getUsers: () => request('/users'),
  createUser: (username: string, password: string, role?: string) =>
    request('/users', { method: 'POST', body: JSON.stringify({ username, password, role }) }),

  // Session WAHA
  getSession: () => request('/session'),
  getQR: () => request('/session/qr'),
  startSession: (body?: Record<string, unknown>) =>
    request('/session/start', { method: 'POST', body: JSON.stringify(body ?? {}) }),
  stopSession: () => request('/session/stop', { method: 'POST' }),
  requestPairingCode: (phoneNumber: string) =>
    request('/session/pairing-code', { method: 'POST', body: JSON.stringify({ phoneNumber }) }),

  // Health
  health: () => request('/health'),
};
