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
    'X-API-Key': config.wahaApiKey,
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

export async function getSession(session = config.wahaSessionName) {
  return request({ method: 'GET', path: `/api/sessions/${session}` });
}

export async function createSession(session = config.wahaSessionName) {
  return request({ method: 'POST', path: '/api/sessions', body: { name: session } });
}

export async function restartSession(session = config.wahaSessionName) {
  return request({ method: 'POST', path: `/api/sessions/${session}/restart` });
}

export async function startSession(session = config.wahaSessionName, body?: Record<string, unknown>) {
  return request({
    method: 'POST',
    path: `/api/sessions/${session}/start`,
    body: {
      config: {
        noweb: {
          store: {
            enabled: true,
            fullSync: true,
          },
        },
      },
      ...body,
    },
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
      headers: { 'X-API-Key': config.wahaApiKey, Accept: 'image/png' },
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

export async function sendText(session: string, body: { chatId: string; text: string; replyTo?: string }) {
  return request({ method: 'POST', path: `/api/sendText`, body: { session, ...body } });
}

export async function sendImage(session: string, body: { chatId: string; file: string; caption?: string }) {
  return request({ method: 'POST', path: `/api/sendImage`, body: { session, ...body } });
}

export async function sendFile(session: string, body: { chatId: string; file: string; filename?: string }) {
  return request({ method: 'POST', path: `/api/sendFile`, body: { session, ...body } });
}

export async function sendVideo(session: string, body: { chatId: string; file: string; caption?: string }) {
  return request({ method: 'POST', path: `/api/sendVideo`, body: { session, ...body } });
}

export async function sendVoice(session: string, body: { chatId: string; file: string }) {
  return request({ method: 'POST', path: `/api/sendVoice`, body: { session, ...body } });
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
  return request({ method: 'GET', path: `/api/${session}/contacts` });
}

export async function getGroups(session = config.wahaSessionName) {
  return request({ method: 'GET', path: `/api/${session}/groups` });
}

export async function getMessages(session: string, chatId: string, limit = 50) {
  return request({ method: 'GET', path: `/api/${session}/chats/${chatId}/messages?limit=${limit}` });
}

// ===== Media =====

export async function getFile(messageId: string) {
  return request<{ url: string; mimetype: string; filesize: number }>({
    method: 'GET',
    path: `/api/files/${messageId}`,
  });
}
