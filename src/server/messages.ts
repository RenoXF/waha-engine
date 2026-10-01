import { Elysia, t } from 'elysia';
import { getDb } from '@/db/client';
import { ssePush } from '@/waha/sse-pubsub';
import * as waha from '@/waha/client';
import { config } from '@/config';

export const messageRoutes = new Elysia({ prefix: '/messages' })
  // GET /messages — list chats
  .get('/', async () => {
    const db = getDb();
    const chats = await db`
      SELECT * FROM app_chats
      WHERE is_archived = false
      ORDER BY is_pinned DESC, last_message_at DESC NULLS LAST
      LIMIT 200
    `;
    return { success: true, data: chats };
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
        SELECT * FROM app_messages
        WHERE chat_jid = ${chatJid} AND (wa_timestamp, id) < (${cursor}, ${cursorId})
        ORDER BY wa_timestamp DESC, id DESC
        LIMIT ${limit}
      `;
    } else {
      messages = await db`
        SELECT * FROM app_messages
        WHERE chat_jid = ${chatJid}
        ORDER BY wa_timestamp DESC, id DESC
        LIMIT ${limit}
      `;
    }

    return { success: true, data: messages.reverse() };
  })

  // POST /messages/send-text
  .post('/send-text', async ({ request }) => {
    const body = await request.json();
    const { recipient, message } = body as { recipient: string; message: string };

    if (!recipient || !message) {
      return Response.json({ error: 'recipient and message required' }, { status: 400 });
    }

    const session = config.wahaSessionName;

    // Optimistic insert
    const db = getDb();
    const tempId = `pending_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const now = new Date().toISOString();

    await db`
      INSERT INTO app_messages (id, chat_jid, from_me, message_type, body, wa_timestamp)
      VALUES (${tempId}, ${recipient}, true, 'text', ${message}, ${now})
    `;
    await db`
      INSERT INTO app_message_status (message_id, chat_jid, status, pending_at, updated_at)
      VALUES (${tempId}, ${recipient}, 'pending', now(), now())
    `;

    ssePush('message', { chatJid: recipient, message: { id: tempId, chatJid: recipient, fromMe: true, body: message, messageType: 'text', waTimestamp: now } });

    // Send to WAHA
    try {
      const result = await waha.sendText(session, { chatId: recipient, text: message }) as Record<string, unknown>;
      const key = result.key as Record<string, unknown> | undefined;

      if (key?.id) {
        // Replace temp ID with real ID
        await db`UPDATE app_messages SET id = ${key.id as string} WHERE id = ${tempId}`;
        await db`UPDATE app_message_status SET message_id = ${key.id as string} WHERE message_id = ${tempId}`;
        ssePush('message_status', { id: key.id, chatJid: recipient, status: 'sent' });
      }

      // Schedule poll fallback
      setTimeout(async () => {
        const msg = await db`SELECT status FROM app_message_status WHERE message_id = ${key?.id as string || tempId} LIMIT 1`;
        if (msg[0]?.status === 'pending') {
          await db`UPDATE app_message_status SET status = 'failed', failed_at = now(), updated_at = now() WHERE message_id = ${key?.id as string || tempId}`;
          ssePush('message_failed', { messageId: key?.id as string || tempId });
        }
      }, 30_000);

      return { success: true, data: { messageId: key?.id || tempId } };
    } catch (err) {
      await db`UPDATE app_message_status SET status = 'failed', failed_at = now(), error_message = ${String(err)}, updated_at = now() WHERE message_id = ${tempId}`;
      ssePush('message_failed', { messageId: tempId });
      return Response.json({ error: String(err) }, { status: 500 });
    }
  })

  // POST /messages/send-reply
  .post('/send-reply', async ({ request }) => {
    const body = await request.json();
    const { recipient, message, quotedId } = body as { recipient: string; message: string; quotedId: string };

    if (!recipient || !message) {
      return Response.json({ error: 'recipient and message required' }, { status: 400 });
    }

    const session = config.wahaSessionName;
    const db = getDb();
    const tempId = `pending_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const now = new Date().toISOString();

    await db`INSERT INTO app_messages (id, chat_jid, from_me, message_type, body, quoted_id, wa_timestamp) VALUES (${tempId}, ${recipient}, true, 'text', ${message}, ${quotedId}, ${now})`;
    await db`INSERT INTO app_message_status (message_id, chat_jid, status, pending_at, updated_at) VALUES (${tempId}, ${recipient}, 'pending', now(), now())`;
    ssePush('message', { chatJid: recipient, message: { id: tempId, chatJid: recipient, fromMe: true, body, messageType: 'text', waTimestamp: now } });

    try {
      const result = await waha.sendText(session, { chatId: recipient, text: message, replyTo: quotedId }) as Record<string, unknown>;
      const key = result.key as Record<string, unknown> | undefined;
      if (key?.id) {
        await db`UPDATE app_messages SET id = ${key.id as string} WHERE id = ${tempId}`;
        await db`UPDATE app_message_status SET message_id = ${key.id as string} WHERE message_id = ${tempId}`;
        ssePush('message_status', { id: key.id, chatJid: recipient, status: 'sent' });
      }
      setTimeout(async () => {
        const msg = await db`SELECT status FROM app_message_status WHERE message_id = ${key?.id as string || tempId} LIMIT 1`;
        if (msg[0]?.status === 'pending') {
          await db`UPDATE app_message_status SET status = 'failed', failed_at = now(), updated_at = now() WHERE message_id = ${key?.id as string || tempId}`;
          ssePush('message_failed', { messageId: key?.id as string || tempId });
        }
      }, 30_000);
      return { success: true, data: { messageId: key?.id || tempId } };
    } catch (err) {
      await db`UPDATE app_message_status SET status = 'failed', failed_at = now(), error_message = ${String(err)}, updated_at = now() WHERE message_id = ${tempId}`;
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
