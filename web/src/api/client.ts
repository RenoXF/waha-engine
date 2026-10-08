const BASE = '';

export interface ApiResp<T> {
  success: boolean;
  data: T;
}

export interface CallRow {
  id: string;
  chat_jid: string;
  from_jid: string;
  body: string;
  wa_timestamp: string;
  display_name: string;
}

export interface StatusRow {
  id: string;
  from_jid: string;
  body: string | null;
  message_type: string;
  has_media: boolean;
  media_mime: string | null;
  media_path: string | null;
  wa_timestamp: string;
  display_name: string;
}

export interface ParticipantRow {
  participant_jid: string;
  is_admin: boolean;
  push_name: string | null;
  avatar_path: string | null;
}

export interface UserRow {
  id: string;
  username: string;
  role: string;
  is_active: boolean;
}

async function request<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const isForm = options?.body instanceof FormData;
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { ...(isForm ? {} : { 'Content-Type': 'application/json' }), ...options?.headers },
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
  getCalls: () => request<ApiResp<CallRow[]>>('/messages/calls'),
  getStatuses: () => request<ApiResp<StatusRow[]>>('/messages/status'),
  sendText: (recipient: string, message: string, clientTempId?: string) =>
    request<{ success: boolean; data: { messageId: string } }>('/messages/send-text', {
      method: 'POST',
      body: JSON.stringify({ recipient, message, clientTempId }),
    }),
  sendReply: (recipient: string, message: string, quotedId: string, clientTempId?: string) =>
    request<{ success: boolean; data: { messageId: string } }>('/messages/send-reply', {
      method: 'POST',
      body: JSON.stringify({ recipient, message, quotedId, clientTempId }),
    }),
  sendMedia: (form: FormData) =>
    request<{ success: boolean; data: { messageId: string } }>('/messages/send-media', { method: 'POST', body: form }),
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
  getGroupParticipants: (id: string) => request<ApiResp<ParticipantRow[]>>(`/groups/${id}/participants`),

  // Users
  getUsers: () => request<ApiResp<UserRow[]>>('/users'),
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
