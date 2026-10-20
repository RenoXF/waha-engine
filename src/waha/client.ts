import { config } from '@/config';
import { logger } from '@/logger';

interface WahaOptions {
  method: string;
  path: string;
  body?: unknown;
}

async function request<T = unknown>({ method, path, body }: WahaOptions): Promise<T> {
  const url = `${config.wahaBaseUrl}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      logger.error(`[waha] ${method} ${path} → ${res.status}: ${text}`);
      throw new Error(`WAHA ${res.status}: ${text}`);
    }

    return res.json() as Promise<T>;
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      throw new Error(`WAHA timeout: ${method} ${path} took >30s`);
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

// ===== Session =====

// NOWEB store harus aktif, kalau tidak endpoint chat membalas 400.
// WAHA tidak punya env var untuk ini — config hanya bisa dikirim lewat API,
// jadi dikirim di createSession dan startSession.
const NOWEB_STORE_CONFIG = {
  noweb: { store: { enabled: true, fullSync: true } },
};

export async function getSession(session = config.wahaSessionName) {
  return request({ method: 'GET', path: `/api/sessions/${session}` });
}

export async function createSession(session = config.wahaSessionName) {
  return request({
    method: 'POST',
    path: '/api/sessions',
    body: { name: session, config: NOWEB_STORE_CONFIG },
  });
}

export async function deleteSession(session = config.wahaSessionName) {
  return request({ method: 'DELETE', path: `/api/sessions/${session}` });
}

export async function restartSession(session = config.wahaSessionName) {
  return request({ method: 'POST', path: `/api/sessions/${session}/restart` });
}

export async function startSession(session = config.wahaSessionName, body?: Record<string, unknown>) {
  return request({
    method: 'POST',
    path: `/api/sessions/${session}/start`,
    body: { config: NOWEB_STORE_CONFIG, ...body },
  });
}

export async function stopSession(session = config.wahaSessionName) {
  return request({ method: 'POST', path: `/api/sessions/${session}/stop` });
}

export async function logoutSession(session = config.wahaSessionName) {
  return request({ method: 'POST', path: `/api/sessions/${session}/logout` });
}

export async function getQR(session = config.wahaSessionName) {
  // WAHA returns PNG image binary by default. Request base64 JSON instead.
  const url = `${config.wahaBaseUrl}/api/${session}/auth/qr?format=image`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'image/png' },
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`WAHA ${res.status}: ${text}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:image/png;base64,${buf.toString('base64')}`;
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new Error('WAHA timeout: getQR');
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

export async function requestPairingCode(session = config.wahaSessionName, phoneNumber: string) {
  return request({
    method: 'POST',
    path: `/api/${session}/auth/request-code`,
    body: { phoneNumber },
  });
}

// ===== Send =====

export async function sendText(
  session: string,
  body: { chatId: string; text: string; replyTo?: string },
) {
  // WAHA's MessageTextRequest memakai `reply_to` (snake_case) + whitelist
  // ValidationPipe, jadi `replyTo` akan diabaikan tanpa error.
  const { replyTo, ...rest } = body;
  return request({
    method: 'POST',
    path: `/api/sendText`,
    body: { session, ...rest, ...(replyTo ? { reply_to: replyTo } : {}) },
  });
}

// WAHA's fileToMessage requires an object ({url} or {data}); a plain string
// throws a TypeError. `PUT /api/reaction` (bukan POST) — lihat chatting.controller.
export async function sendReaction(
  session: string,
  body: { chatId: string; messageId: string; reaction: string },
) {
  return request({ method: 'PUT', path: `/api/reaction`, body: { session, ...body } });
}

type WahaFile =
  | string
  | { url: string; mimetype?: string; filename?: string }
  | { data: string; mimetype?: string; filename?: string };
function filePayload(file: WahaFile) {
  return typeof file === 'string' ? { url: file } : file;
}

export async function sendImage(session: string, body: { chatId: string; file: WahaFile; caption?: string }) {
  return request({ method: 'POST', path: `/api/sendImage`, body: { session, ...body, file: filePayload(body.file) } });
}

export async function sendFile(session: string, body: { chatId: string; file: WahaFile; filename?: string; caption?: string }) {
  return request({ method: 'POST', path: `/api/sendFile`, body: { session, ...body, file: filePayload(body.file) } });
}

export async function sendVideo(session: string, body: { chatId: string; file: WahaFile; caption?: string }) {
  return request({ method: 'POST', path: `/api/sendVideo`, body: { session, ...body, file: filePayload(body.file) } });
}

export async function sendVoice(session: string, body: { chatId: string; file: WahaFile }) {
  return request({ method: 'POST', path: `/api/sendVoice`, body: { session, ...body, file: filePayload(body.file) } });
}

// ===== Read / Presence =====

export async function sendSeen(session: string, chatId: string) {
  return request({ method: 'POST', path: `/api/sendSeen`, body: { session, chatId } });
}

export async function setPresence(session: string, presence: string, chatId?: string) {
  return request({ method: 'POST', path: `/api/${session}/presence`, body: { presence, chatId } });
}

// ===== Chats / Contacts / Groups =====

export async function getChats(session = config.wahaSessionName) {
  return request({ method: 'GET', path: `/api/${session}/chats` });
}

export async function getContacts(session = config.wahaSessionName) {
  // WAHA 2026.9.x: contacts list is at /api/contacts/all?session=X
  // (the /api/:session/contacts route only has GET /:id and PUT /:chatId)
  return request({ method: 'GET', path: `/api/contacts/all?session=${session}` });
}

export async function getGroups(session = config.wahaSessionName) {
  return request({ method: 'GET', path: `/api/${session}/groups` });
}

export async function getGroupParticipants(session: string, groupId: string) {
  return request<Array<{ id: string; phoneNumber?: string; admin?: boolean | null }>>({
    method: 'GET',
    path: `/api/${session}/groups/${groupId}/participants`,
  });
}

// ===== LID ↔ Phone Number mapping =====

export async function getAllLids(session = config.wahaSessionName, limit = 1000) {
  return request<Array<{ lid: string; pn: string | null }>>({
    method: 'GET',
    path: `/api/${session}/lids?limit=${limit}`,
  });
}

export async function getMessages(session: string, chatId: string, limit = 50, downloadMedia = false) {
  return request({
    method: 'GET',
    path: `/api/${session}/chats/${chatId}/messages?limit=${limit}&downloadMedia=${downloadMedia}`,
  });
}

