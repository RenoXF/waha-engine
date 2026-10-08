import { Elysia, t } from 'elysia';
import { getDb } from '@/db/client';
import { ssePush } from '@/waha/sse-pubsub';
import * as waha from '@/waha/client';
import { config } from '@/config';
import { getMediaType, getExtension, storeLocalFile } from '@/waha/media';

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const TEMP_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Swap temp id → WAHA id, push `sent`, schedule the 30s pending→failed poll.
 * Returns the id the message now lives under.
 */
async function settleSend(tempId: string, recipient: string, keyId?: string): Promise<string> {
  const db = getDb();
  const finalId = keyId || tempId;
  if (keyId && keyId !== tempId) {
    await db`UPDATE app_messages SET id = ${keyId} WHERE id = ${tempId}`;
    await db`UPDATE app_message_status SET message_id = ${keyId} WHERE message_id = ${tempId}`;
  }
  if (keyId) {
    // Record sent in DB too — otherwise the 30s poll can mark a delivered message failed
    await db`UPDATE app_message_status SET status = 'sent', sent_at = COALESCE(sent_at, now()), updated_at = now() WHERE message_id = ${finalId}`;
    ssePush('message_status', { id: finalId, chatJid: recipient, status: 'sent' });
  }
  setTimeout(async () => {
    try {
      const msg = await db`SELECT status FROM app_message_status WHERE message_id = ${finalId} LIMIT 1`;
      if (msg[0]?.status === 'pending') {
        await db`UPDATE app_message_status SET status = 'failed', failed_at = now(), updated_at = now() WHERE message_id = ${finalId}`;
        ssePush('message_failed', { messageId: finalId });
      }
    } catch { /* next event or retry will surface it */ }
  }, 30_000);
  return finalId;
}

async function failSend(tempId: string, err: unknown): Promise<void> {
  const db = getDb();
  await db`UPDATE app_message_status SET status = 'failed', failed_at = now(), updated_at = now(), error_message = ${String(err)} WHERE message_id = ${tempId}`;
  ssePush('message_failed', { messageId: tempId });
}

/** Ensure a pending message row exists (fresh insert, or reset in place on retry). Returns true if fresh. */
async function ensurePendingText(
  tempId: string,
  recipient: string,
  message: string,
  now: string,
  quotedId: string | null,
): Promise<boolean> {
  const db = getDb();
  const existing = await db`SELECT id FROM app_messages WHERE id = ${tempId} LIMIT 1`;
  if (existing.length > 0) {
    await db`
      INSERT INTO app_message_status (message_id, chat_jid, status, pending_at, updated_at)
      VALUES (${tempId}, ${recipient}, 'pending', now(), now())
      ON CONFLICT (message_id) DO UPDATE SET
        status = 'pending', pending_at = now(), failed_at = null, error_message = null, updated_at = now()
    `;
    return false;
  }
  await db`
    INSERT INTO app_messages (id, chat_jid, from_me, message_type, body, quoted_id, wa_timestamp)
    VALUES (${tempId}, ${recipient}, true, 'text', ${message}, ${quotedId}, ${now})
  `;
  await db`
    INSERT INTO app_message_status (message_id, chat_jid, status, pending_at, updated_at)
    VALUES (${tempId}, ${recipient}, 'pending', now(), now())
  `;
  return true;
}

/** SSE payload matching the webhook `message` shape (snake_case Message). */
function pushPendingText(tempId: string, recipient: string, message: string, quotedId: string | null, now: string): void {
  ssePush('message', {
    chatJid: recipient,
    message: {
      id: tempId,
      chat_jid: recipient,
      from_jid: null,
      from_me: true,
      participant: null,
      message_type: 'text',
      body: message,
      quoted_id: quotedId,
      forwarded: false,
      is_starred: false,
      has_media: false,
      media_path: null,
      media_mime: null,
      media_url: null,
      media_filename: null,
      is_edited: false,
      is_deleted: false,
      status: 'pending',
      wa_timestamp: now,
      created_at: now,
    },
  });
}

export const messageRoutes = new Elysia({ prefix: '/messages' })
  // GET /messages — list chats (exclude broadcast/status)
  .get('/', async () => {
    const db = getDb();
    const chats = await db`
      SELECT
        ch.*,
        COALESCE(
          c.push_name,
          c.custom_name,
          pn_c.push_name,
          pn_c.custom_name,
          ch.name,
          ch.chat_jid
        ) AS resolved_name,
        lm.pn AS resolved_phone
      FROM app_chats ch
      -- Direct contact match
      LEFT JOIN app_contacts c ON c.jid = ch.chat_jid
      -- LID → PN mapping
      LEFT JOIN app_lid_pn_mapping lm ON lm.lid = ch.chat_jid
      -- Contact via resolved PN
      LEFT JOIN app_contacts pn_c ON pn_c.jid = lm.pn
      WHERE ch.is_archived = false
        AND ch.chat_jid NOT LIKE '%@broadcast'
        AND ch.chat_jid NOT LIKE '%@newsletter'
      ORDER BY ch.is_pinned DESC, ch.last_message_at DESC NULLS LAST
      LIMIT 200
    `;

    // Replace name with resolved name
    const data = chats.map((c) => ({
      ...c,
      name: c.resolved_name || c.name,
      is_lid: String(c.chat_jid).endsWith('@lid'),
    }));

    return { success: true, data };
  })

  // GET /messages/status — all status/broadcast messages
  .get('/status', async () => {
    const db = getDb();
    const statuses = await db`
      SELECT m.id, m.from_jid, m.body, m.message_type, m.has_media, m.wa_timestamp,
             m.media_mime, m.media_path,
             COALESCE(c.push_name, c.custom_name, m.from_jid) as display_name
      FROM app_messages m
      LEFT JOIN app_contacts c ON m.from_jid = c.jid
      WHERE m.chat_jid LIKE '%@broadcast'
      ORDER BY m.wa_timestamp DESC
      LIMIT 100
    `;
    return { success: true, data: statuses };
  })

  // GET /messages/search?q=
  .get('/search', async ({ query }) => {
    const db = getDb();
    const q = query.q;
    if (!q) return { success: true, data: [] };

    const results = await db`
      SELECT DISTINCT ON (chat_jid) m.*, ms.status
      FROM app_messages m
      LEFT JOIN app_message_status ms ON m.id = ms.message_id
      WHERE m.body ILIKE ${'%' + q + '%'}
      ORDER BY chat_jid, m.wa_timestamp DESC
      LIMIT 50
    `;
    return { success: true, data: results };
  })

  // GET /messages/:chatJid — messages in chat (cursor pagination)
  .get('/:chatJid', async ({ params, query }) => {
    const db = getDb();
    const { chatJid } = params;
    const limit = Math.min(Number(query.limit) || 50, 100);
    const cursor = query.cursor; // ISO timestamp
    const cursorId = query.cursorId;

    let messages;
    if (cursor && cursorId) {
      messages = await db`
        SELECT m.*, q.body AS quoted_body, q.from_me AS quoted_from_me, q.from_jid AS quoted_from_jid,
               q.message_type AS quoted_type, q.is_deleted AS quoted_deleted,
               ms.status, ms.pending_at, ms.sent_at, ms.delivered_at, ms.read_at, ms.failed_at
        FROM app_messages m
        LEFT JOIN app_messages q ON q.id = m.quoted_id
        LEFT JOIN app_message_status ms ON ms.message_id = m.id
        WHERE m.chat_jid = ${chatJid} AND (m.wa_timestamp, m.id) < (${cursor}, ${cursorId})
        ORDER BY m.wa_timestamp DESC, m.id DESC
        LIMIT ${limit}
      `;
    } else {
      messages = await db`
        SELECT m.*, q.body AS quoted_body, q.from_me AS quoted_from_me, q.from_jid AS quoted_from_jid,
               q.message_type AS quoted_type, q.is_deleted AS quoted_deleted,
               ms.status, ms.pending_at, ms.sent_at, ms.delivered_at, ms.read_at, ms.failed_at
        FROM app_messages m
        LEFT JOIN app_messages q ON q.id = m.quoted_id
        LEFT JOIN app_message_status ms ON ms.message_id = m.id
        WHERE m.chat_jid = ${chatJid}
        ORDER BY m.wa_timestamp DESC, m.id DESC
        LIMIT ${limit}
      `;
    }

    return { success: true, data: messages.reverse() };
  })

  // POST /messages/send-text
  .post('/send-text', async ({ request }) => {
    const body = await request.json();
    const { recipient, message, clientTempId } = body as { recipient: string; message: string; clientTempId?: string };

    if (!recipient || !message) {
      return Response.json({ error: 'recipient and message required' }, { status: 400 });
    }

    const session = config.wahaSessionName;
    const tempId = clientTempId && TEMP_ID_RE.test(clientTempId) ? clientTempId : `pending_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const now = new Date().toISOString();

    const fresh = await ensurePendingText(tempId, recipient, message, now, null);
    if (fresh) pushPendingText(tempId, recipient, message, null, now);

    // Send to WAHA
    try {
      const result = await waha.sendText(session, { chatId: recipient, text: message }) as Record<string, unknown>;
      const key = result.key as Record<string, unknown> | undefined;
      const finalId = await settleSend(tempId, recipient, key?.id as string | undefined);
      return { success: true, data: { messageId: finalId } };
    } catch (err) {
      await failSend(tempId, err);
      return Response.json({ error: String(err) }, { status: 500 });
    }
  })

  // POST /messages/send-reply
  .post('/send-reply', async ({ request }) => {
    const body = await request.json();
    const { recipient, message, quotedId, clientTempId } = body as {
      recipient: string; message: string; quotedId: string; clientTempId?: string;
    };

    if (!recipient || !message) {
      return Response.json({ error: 'recipient and message required' }, { status: 400 });
    }

    const session = config.wahaSessionName;
    const tempId = clientTempId && TEMP_ID_RE.test(clientTempId) ? clientTempId : `pending_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const now = new Date().toISOString();

    const fresh = await ensurePendingText(tempId, recipient, message, now, quotedId || null);
    if (fresh) pushPendingText(tempId, recipient, message, quotedId || null, now);

    try {
      const result = await waha.sendText(session, { chatId: recipient, text: message, replyTo: quotedId }) as Record<string, unknown>;
      const key = result.key as Record<string, unknown> | undefined;
      const finalId = await settleSend(tempId, recipient, key?.id as string | undefined);
      return { success: true, data: { messageId: finalId } };
    } catch (err) {
      await failSend(tempId, err);
      return Response.json({ error: String(err) }, { status: 500 });
    }
  })

  // POST /messages/send-media — multipart: file, recipient, caption?, clientTempId?
  .post('/send-media', async ({ request }) => {
    const form = await request.formData();
    const file = form.get('file');
    const recipient = String(form.get('recipient') || '').trim();
    const captionRaw = String(form.get('caption') || '').trim();
    const clientTempId = String(form.get('clientTempId') || '');

    if (!(file instanceof File)) return Response.json({ error: 'file required' }, { status: 400 });
    if (!recipient) return Response.json({ error: 'recipient required' }, { status: 400 });
    if (file.size > MAX_UPLOAD_BYTES) {
      return Response.json({ error: 'File too large (max 50MB)' }, { status: 413 });
    }

    const tempId = TEMP_ID_RE.test(clientTempId) ? clientTempId : `pending_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const mime = file.type || 'application/octet-stream';
    const mediaType = getMediaType(mime); // picture|video|audio|document
    const messageType = mediaType === 'picture' ? 'image' : mediaType;
    const caption = captionRaw || null;
    const originalName = (file.name || 'file').replace(/[^\w.\- ()]/g, '_').slice(0, 120);
    const filename = `${tempId}.${getExtension(mime)}`;
    const session = config.wahaSessionName;
    const db = getDb();
    const now = new Date().toISOString();

    // 1. Store file first so /files/download/:id resolves as soon as the row exists
    let relativePath: string;
    try {
      relativePath = await storeLocalFile(mediaType, filename, file);
    } catch (e) {
      return Response.json({ error: String(e) }, { status: 500 });
    }

    // 2. Optimistic insert (snake_case SSE — same shape as webhook)
    await db`
      INSERT INTO app_messages (id, chat_jid, from_me, message_type, body, wa_timestamp, has_media, media_path, media_mime, media_filename, media_size)
      VALUES (${tempId}, ${recipient}, true, ${messageType}, ${caption}, ${now}, true, ${relativePath}, ${mime}, ${originalName}, ${file.size})
    `;
    await db`
      INSERT INTO app_message_status (message_id, chat_jid, status, pending_at, updated_at)
      VALUES (${tempId}, ${recipient}, 'pending', now(), now())
    `;
    ssePush('message', {
      chatJid: recipient,
      message: {
        id: tempId,
        chat_jid: recipient,
        from_jid: null,
        from_me: true,
        participant: null,
        message_type: messageType,
        body: caption,
        quoted_id: null,
        forwarded: false,
        is_starred: false,
        has_media: true,
        media_path: relativePath,
        media_mime: mime,
        media_url: null,
        media_filename: originalName,
        is_edited: false,
        is_deleted: false,
        status: 'pending',
        wa_timestamp: now,
        created_at: now,
      },
    });
    ssePush('chats', null);

    // 3. Hand to WAHA — it fetches the file from our own /files route
    const fileUrl = `http://127.0.0.1:${config.port}/files/${mediaType}/${filename}`;
    const payload = { url: fileUrl, mimetype: mime, filename: originalName };
    try {
      let result: unknown;
      if (mime.startsWith('image/')) {
        result = await waha.sendImage(session, { chatId: recipient, file: payload, caption: caption || undefined });
      } else if (mime.startsWith('video/')) {
        result = await waha.sendVideo(session, { chatId: recipient, file: payload, caption: caption || undefined });
      } else if (mime === 'audio/ogg' || mime === 'audio/opus') {
        result = await waha.sendVoice(session, { chatId: recipient, file: payload });
      } else {
        result = await waha.sendFile(session, { chatId: recipient, file: payload, filename: originalName, caption: caption || undefined });
      }
      const key = (result as Record<string, unknown> | undefined)?.key as Record<string, unknown> | undefined;
      const finalId = await settleSend(tempId, recipient, key?.id as string | undefined);
      return { success: true, data: { messageId: finalId } };
    } catch (err) {
      await failSend(tempId, err);
      return Response.json({ error: String(err) }, { status: 500 });
    }
  })

  // POST /messages/delete
  .post('/delete', async ({ request }) => {
    const body = await request.json();
    const { messageId, chatJid } = body as { messageId: string; chatJid: string };
    if (!messageId) return Response.json({ error: 'messageId required' }, { status: 400 });

    const db = getDb();
    await db`UPDATE app_messages SET is_deleted = true, deleted_at = now(), updated_at = now() WHERE id = ${messageId}`;
    ssePush('message_deleted', { chatJid, messageId });
    return { success: true };
  })

  // POST /messages/edit
  .post('/edit', async ({ request }) => {
    const body = await request.json();
    const { messageId, chatJid, message } = body as { messageId: string; chatJid: string; message: string };
    if (!messageId || !message) return Response.json({ error: 'messageId and message required' }, { status: 400 });

    const db = getDb();
    const old = await db`SELECT body FROM app_messages WHERE id = ${messageId} LIMIT 1`;
    const oldBody = old[0]?.body || null;

    await db`INSERT INTO app_message_edits (message_id, chat_jid, old_body, new_body, edited_at) VALUES (${messageId}, ${chatJid}, ${oldBody}, ${message}, now())`;
    await db`UPDATE app_messages SET body = ${message}, is_edited = true, edited_at = now(), updated_at = now() WHERE id = ${messageId}`;
    ssePush('message_edited', { chatJid, messageId, text: message, originalText: oldBody });
    return { success: true };
  })

  // POST /messages/star
  .post('/star', async ({ request }) => {
    const body = await request.json();
    const { messageId, star } = body as { messageId: string; star: boolean };
    if (!messageId) return Response.json({ error: 'messageId required' }, { status: 400 });

    const db = getDb();
    await db`UPDATE app_messages SET is_starred = ${star}, updated_at = now() WHERE id = ${messageId}`;
    return { success: true };
  })

  // POST /messages/react
  .post('/react', async ({ request }) => {
    const body = await request.json();
    const { messageId, chatJid, emoji } = body as { messageId: string; chatJid: string; emoji: string };
    if (!messageId) return Response.json({ error: 'messageId required' }, { status: 400 });

    const db = getDb();
    if (!emoji) {
      await db`DELETE FROM app_message_reactions WHERE message_id = ${messageId}`;
    } else {
      await db`INSERT INTO app_message_reactions (message_id, chat_jid, reactor_jid, emoji, reacted_at) VALUES (${messageId}, ${chatJid}, 'self', ${emoji}, now()) ON CONFLICT (message_id, reactor_jid) DO UPDATE SET emoji = EXCLUDED.emoji, reacted_at = now()`;
    }
    ssePush('reaction', { chatJid, messageId, emoji });
    return { success: true };
  })

  // GET /messages/calls — all call notifications
  .get('/calls', async () => {
    const db = getDb();
    const calls = await db`
      SELECT m.id, m.chat_jid, m.from_jid, m.body, m.wa_timestamp,
             COALESCE(c.push_name, c.custom_name, m.from_jid) as display_name
      FROM app_messages m
      LEFT JOIN app_contacts c ON m.from_jid = c.jid
      WHERE m.message_type = 'call_notification'
      ORDER BY m.wa_timestamp DESC
      LIMIT 100
    `;
    return { success: true, data: calls };
  })

  // POST /messages/read
  .post('/read', async ({ request }) => {
    const body = await request.json();
    const { chatJid } = body as { chatJid: string };

    if (!chatJid) {
      return Response.json({ error: 'chatJid required' }, { status: 400 });
    }

    const session = config.wahaSessionName;
    await waha.sendSeen(session, chatJid).catch(() => {});

    const db = getDb();
    await db`UPDATE app_chats SET unread_count = 0, updated_at = now() WHERE chat_jid = ${chatJid}`;

    ssePush('chat_read', { jid: chatJid });
    return { success: true };
  });
