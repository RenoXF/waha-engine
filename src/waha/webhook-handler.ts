import { config } from '@/config';
import { ssePush } from './sse-pubsub';
import { logger } from '@/logger';
import { getDb } from '@/db/client';
import * as waha from './client';
import { authorJidOf, messageTypeOf, quotedIdOf } from './extract';

export async function handleWebhook(event: string, payload: Record<string, unknown>): Promise<void> {
  const session = config.wahaSessionName;

  try {
    switch (event) {
      case 'message':
      case 'message.any':
        await handleMessage(payload);
        break;

      case 'message.ack':
        await handleAck(payload);
        break;

      case 'message.ack.group':
        await handleGroupAck(payload);
        break;

      case 'message.reaction':
        await handleReaction(payload);
        break;

      case 'message.edited':
        await handleEdited(payload);
        break;

      case 'message.revoked':
        await handleRevoked(payload);
        break;

      case 'session.status': {
        // Payload: { name, status, statuses } — bukan `state`.
        const p = payload.payload as { status?: string } | undefined;
        const state = p?.status || (payload as { status?: string }).status || 'UNKNOWN';
        ssePush('device_state', { state });
        // Auto-sync when session becomes WORKING
        if (state === 'WORKING') {
          logger.info('[webhook] Session WORKING — triggering sync');
          const { syncFromWaha } = await import('./sync');
          syncFromWaha().catch(e => logger.error(e, '[webhook] Auto-sync failed'));
        }
        break;
      }
      case 'presence.update':
        ssePush('presence', payload);
        break;

      case 'group.v2.join':
      case 'group.v2.update':
      case 'group.v2.participants':
        ssePush('group', payload);
        break;

      case 'call.received':
        await handleCallReceived(payload);
        break;

      default:
        logger.debug(`[webhook] Unhandled event: ${event}`);
    }
  } catch (err) {
    // logger.error sudah menulis ke app_logs — tidak perlu insert manual.
    logger.error(err, `[webhook] Error handling ${event}`);
  }
}

async function handleMessage(payload: Record<string, unknown>): Promise<void> {
  const db = getDb();
  const msg = payload.payload as Record<string, unknown> | undefined;
  if (!msg) return;

  const id = msg.id as string;
  const chatJid = (msg.from as string) || (msg.to as string);
  const fromMe = (msg.fromMe as boolean) || false;
  const body = (msg.body as string) || null;
  const timestamp = msg.timestamp as number;
  const waTimestamp = timestamp ? new Date(timestamp * 1000).toISOString() : new Date().toISOString();
  const participant = (msg.participant as string) || null;
  const quotedId = quotedIdOf(msg);
  // WAMessage: `hasMedia` boolean, `media: {url, mimetype, filename}` (null kalau
  // download gagal), dan `mediaUrl` (deprecated). Tidak ada `type`/`filesize`.
  const media = (msg.media as Record<string, unknown> | null) ?? null;
  const mediaMime = (media?.mimetype as string) || null;
  const mediaUrl = (media?.url as string) || (msg.mediaUrl as string) || null;
  const mediaFilename = (media?.filename as string) || null;
  const mediaSize = (media?.filesize as number) || null;
  const hasMedia = Boolean(msg.hasMedia ?? media);
  const messageType = messageTypeOf(msg);

  if (!id || !chatJid) return;

  // Skip newsletter only (keep broadcast/status)
  if (chatJid.includes('@newsletter')) return;

  // ── Auto-save contact from message metadata ──
  // pushName hanya bermakna untuk pesan masuk; pada pesan keluar isinya nama
  // kita sendiri, bukan nama lawan bicara.
  const rawData = msg._data as Record<string, unknown> | undefined;
  const pushName = (rawData?.pushName as string) || null;
  const senderJid = authorJidOf(msg, chatJid);
  const [idPart, suffix = ''] = senderJid.split('@');
  const senderPhone =
    (suffix === 'c.us' || suffix === 's.whatsapp.net') ? (idPart ?? null) : null;

  if (!fromMe && pushName) {
    await db`
      INSERT INTO app_contacts (jid, push_name, phone, synced_at, updated_at)
      VALUES (${senderJid}, ${pushName}, ${senderPhone}, now(), now())
      ON CONFLICT (jid) DO UPDATE SET
        push_name = COALESCE(EXCLUDED.push_name, app_contacts.push_name),
        phone = COALESCE(app_contacts.phone, EXCLUDED.phone),
        updated_at = now()
    `.catch(() => {});
  }

  // Upsert message — WAHA may deliver both `message` and `message.any`
  const inserted = await db`
    INSERT INTO app_messages (id, chat_jid, from_jid, from_me, participant, message_type, body, quoted_id, wa_timestamp, has_media, media_mime, media_filename, media_size)
    VALUES (${id}, ${chatJid}, ${senderJid}, ${fromMe}, ${participant}, ${messageType}, ${body}, ${quotedId}, ${waTimestamp}, ${hasMedia}, ${mediaMime}, ${mediaFilename}, ${mediaSize})
    ON CONFLICT (id) DO UPDATE SET
      body = COALESCE(EXCLUDED.body, app_messages.body),
      has_media = EXCLUDED.has_media,
      media_mime = COALESCE(EXCLUDED.media_mime, app_messages.media_mime),
      media_filename = COALESCE(EXCLUDED.media_filename, app_messages.media_filename),
      participant = COALESCE(EXCLUDED.participant, app_messages.participant),
      quoted_id = COALESCE(EXCLUDED.quoted_id, app_messages.quoted_id),
      -- Baris lama (terutama status) bisa tersimpan dengan from_jid = chat_jid.
      from_jid = CASE WHEN app_messages.from_jid = app_messages.chat_jid
        THEN EXCLUDED.from_jid ELSE app_messages.from_jid END,
      updated_at = now()
    RETURNING (xmax = 0) AS is_new
  `;
  const isNew = (inserted[0] as { is_new: boolean } | undefined)?.is_new ?? false;

  // Upsert chat — only bump unread for genuinely new incoming messages, and
  // jangan mundurkan preview kalau webhook datang tidak berurutan.
  const preview = body ? body.substring(0, 100) : `[${messageType}]`;
  const chatType = chatJid.includes('@g.us') ? 'group' : 'contact';
  await db`
    INSERT INTO app_chats (chat_jid, chat_type, name, last_message_id, last_message_at, last_message_preview, unread_count, updated_at)
    VALUES (${chatJid}, ${chatType}, ${chatJid}, ${id}, ${waTimestamp}, ${preview}, ${fromMe ? 0 : 1}, now())
    ON CONFLICT (chat_jid) DO UPDATE SET
      chat_type = EXCLUDED.chat_type,
      last_message_id = CASE WHEN EXCLUDED.last_message_at >= COALESCE(app_chats.last_message_at, '-infinity'::timestamptz)
        THEN EXCLUDED.last_message_id ELSE app_chats.last_message_id END,
      last_message_at = CASE WHEN EXCLUDED.last_message_at >= COALESCE(app_chats.last_message_at, '-infinity'::timestamptz)
        THEN EXCLUDED.last_message_at ELSE app_chats.last_message_at END,
      last_message_preview = CASE WHEN EXCLUDED.last_message_at >= COALESCE(app_chats.last_message_at, '-infinity'::timestamptz)
        THEN EXCLUDED.last_message_preview ELSE app_chats.last_message_preview END,
      unread_count = CASE
        WHEN ${fromMe} THEN app_chats.unread_count
        WHEN ${isNew} THEN app_chats.unread_count + 1
        ELSE app_chats.unread_count
      END,
      updated_at = now()
  `;

  if (!isNew) return; // already processed — skip duplicate SSE push

  // Download media if present
  if (hasMedia && mediaUrl) {
    try {
      const { downloadAndStoreMedia } = await import('./media');
      await downloadAndStoreMedia(id, mediaUrl, mediaMime);
    } catch (e) {
      logger.error(e, `[webhook] Media download failed for ${id}`);
    }
  }

  ssePush('message', {
    chatJid,
    message: {
      id,
      chat_jid: chatJid,
      from_jid: senderJid,
      from_me: fromMe,
      participant,
      message_type: messageType,
      body,
      quoted_id: quotedId,
      forwarded: false,
      is_starred: false,
      has_media: hasMedia,
      media_path: null,
      media_mime: mediaMime,
      media_url: mediaUrl,
      media_filename: mediaFilename,
      is_edited: false,
      is_deleted: false,
      wa_timestamp: waTimestamp,
      created_at: waTimestamp,
    },
  });
  ssePush('chats', null);
}

async function handleAck(payload: Record<string, unknown>): Promise<void> {
  const db = getDb();
  const data = payload.payload as Record<string, unknown> | undefined;
  if (!data) return;

  const id = data.id as string;
  const ack = data.ack as number; // 1=sent, 2=delivered, 3=read, 4=played
  // WAMessageAckBody pakai from/to, bukan chatId/remoteJid.
  const chatJid = (data.from as string) || (data.to as string) || '';

  if (!id) return;

  // WAMessageAck: -1 ERROR, 0 PENDING, 1 SERVER, 2 DEVICE, 3 READ, 4 PLAYED.
  const statusMap: Record<number, string> = {
    [-1]: 'failed', 0: 'pending', 1: 'sent', 2: 'delivered', 3: 'read', 4: 'read',
  };
  const status = statusMap[ack] || 'sent';

  await db`
    INSERT INTO app_message_status AS ms (message_id, chat_jid, status, sent_at, delivered_at, read_at, updated_at)
    VALUES (
      ${id}, ${chatJid || ''}, ${status},
      CASE WHEN ${status} = 'sent' THEN now() END,
      CASE WHEN ${status} = 'delivered' THEN now() END,
      CASE WHEN ${status} = 'read' THEN now() END,
      now()
    )
    ON CONFLICT (message_id) DO UPDATE SET
      status = CASE
        WHEN COALESCE(ARRAY_POSITION(ARRAY['pending','sent','delivered','read'], ms.status), 0)
           < COALESCE(ARRAY_POSITION(ARRAY['pending','sent','delivered','read'], EXCLUDED.status), 0)
        THEN EXCLUDED.status ELSE ms.status END,
      sent_at = COALESCE(ms.sent_at, EXCLUDED.sent_at, CASE WHEN EXCLUDED.status IN ('delivered','read') THEN now() END),
      delivered_at = COALESCE(ms.delivered_at, EXCLUDED.delivered_at, CASE WHEN EXCLUDED.status = 'read' THEN now() END),
      read_at = COALESCE(ms.read_at, EXCLUDED.read_at),
      updated_at = now()
  `;

  ssePush('message_status', { id, chatJid, status });
}

async function handleGroupAck(payload: Record<string, unknown>): Promise<void> {
  const db = getDb();
  const data = payload.payload as Record<string, unknown> | undefined;
  if (!data) return;

  const id = data.id as string;
  const participant = data.participant as string;
  const ack = Number(data.ack);
  const chatJid = (data.from as string) || (data.to as string) || '';

  if (!id || !participant || !Number.isFinite(ack)) return;

  // buildMessageId() menambahkan `_<participant>` untuk ack grup; buang sufiks
  // itu supaya id-nya sama dengan app_messages.id.
  const messageId = id.replace(/_[^_]+@[^_]+$/, '');

  // 2 = delivered, 3 = read, 4 = played. 1 (sent) tidak per-participant.
  const status = ack >= 3 ? 'read' : ack === 2 ? 'delivered' : null;
  if (!status) return;

  await db`
    INSERT INTO app_message_receipts (message_id, participant_jid, status, at)
    VALUES (${messageId}, ${participant}, ${status}, now())
    ON CONFLICT (message_id, participant_jid, status) DO UPDATE SET at = EXCLUDED.at
  `;

  ssePush('message_receipt', { chatJid, messageId, participant, status });
}

async function handleReaction(payload: Record<string, unknown>): Promise<void> {
  const db = getDb();
  const data = payload.payload as Record<string, unknown> | undefined;
  if (!data) return;

  // WAMessageReaction: { reaction: { text, messageId }, from, participant }.
  // `id` adalah id pesan reaksinya sendiri, bukan pesan yang direaksi.
  const reaction = (data.reaction || {}) as { text?: string; messageId?: string };
  const messageId = reaction.messageId;
  const emoji = reaction.text ?? '';
  // participant hanya ada di grup; reaksi kita ditandai 'self' supaya cocok
  // dengan /messages/react.
  const reactorJid =
    (data.participant as string) ||
    (data.fromMe ? 'self' : (data.from as string));
  const chatJid = (data.from as string) || '';

  if (!messageId) return;

  if (emoji === '') {
    await db`DELETE FROM app_message_reactions WHERE message_id = ${messageId} AND reactor_jid = ${reactorJid}`;
  } else {
    await db`
      INSERT INTO app_message_reactions (message_id, chat_jid, reactor_jid, emoji, reacted_at)
      VALUES (${messageId}, ${chatJid}, ${reactorJid}, ${emoji}, now())
      ON CONFLICT (message_id, reactor_jid) DO UPDATE SET emoji = EXCLUDED.emoji, reacted_at = now()
    `;
  }

  ssePush('reaction', { chatJid, messageId, reactorJid, emoji });
}

async function handleEdited(payload: Record<string, unknown>): Promise<void> {
  const db = getDb();
  const data = payload.payload as Record<string, unknown> | undefined;
  if (!data) return;

  // WAMessageEditedBody extends WAMessage: `id` = id pesan edit, sedangkan
  // pesan aslinya ada di `editedMessageId`.
  const id = (data.editedMessageId as string) || (data.id as string);
  const newBody = data.body as string;
  const chatJid = (data.from as string) || '';

  if (!id || !newBody) return;

  // Get old body
  const old = await db`SELECT body FROM app_messages WHERE id = ${id} LIMIT 1`;
  const oldBody = old[0]?.body || null;

  // Save edit history
  await db`
    INSERT INTO app_message_edits (message_id, chat_jid, old_body, new_body, edited_at)
    VALUES (${id}, ${chatJid}, ${oldBody}, ${newBody}, now())
  `;

  // Update message
  await db`
    UPDATE app_messages SET body = ${newBody}, is_edited = true, edited_at = now(), updated_at = now()
    WHERE id = ${id}
  `;

  ssePush('message_edited', { chatJid, messageId: id, text: newBody, originalText: oldBody });
}

async function handleRevoked(payload: Record<string, unknown>): Promise<void> {
  const db = getDb();
  const data = payload.payload as Record<string, unknown> | undefined;
  if (!data) return;

  // WAMessageRevokedBody: { revokedMessageId, before, after }.
  // Tidak ada `id`/`from` — `after` adalah stub protocolMessage-nya.
  const after = (data.after || {}) as Record<string, unknown>;
  const id =
    (data.revokedMessageId as string) ||
    ((data.before as Record<string, unknown> | null)?.id as string) ||
    '';
  const chatJid = (after.from as string) || (after.to as string) || '';

  if (!id) return;

  await db`
    UPDATE app_messages
    SET is_deleted = true, deleted_by_me = ${Boolean(after.fromMe)},
        deleted_at = now(), updated_at = now()
    WHERE id = ${id}
  `;

  ssePush('message_deleted', { chatJid, messageId: id });
}

async function handleCallReceived(payload: Record<string, unknown>): Promise<void> {
  const db = getDb();
  const data = payload.payload as Record<string, unknown> | undefined;
  if (!data) return;

  const from = (data.from as string) || (data.peer as string) || null;
  const isVideo = (data.isVideo as boolean) || false;
  const timestamp = data.timestamp as number;
  const waTimestamp = timestamp ? new Date(timestamp * 1000).toISOString() : new Date().toISOString();

  if (!from) return;

  // Dedup: use from + timestamp as stable ID (WAHA may send duplicate events)
  const callId = `call_${from}_${timestamp || Date.now()}`;
  const chatJid = from;
  const body = isVideo ? '📹 Panggilan video tidak terjawab' : '📞 Panggilan tidak terjawab';
  const messageType = 'call_notification';

  // Upsert as message — event panggilan bisa dikirim WAHA berulang
  const inserted = await db`
    INSERT INTO app_messages (id, chat_jid, from_jid, from_me, message_type, body, wa_timestamp)
    VALUES (${callId}, ${chatJid}, ${from}, false, ${messageType}, ${body}, ${waTimestamp})
    ON CONFLICT (id) DO NOTHING
    RETURNING id
  `.catch((e) => {
    logger.error(e, '[webhook] Failed to save call notification');
    return [] as { id: string }[];
  });
  if (inserted.length === 0) return; // duplicate event

  // Update chat
  await db`
    INSERT INTO app_chats (chat_jid, chat_type, name, last_message_id, last_message_at, last_message_preview, unread_count, updated_at)
    VALUES (${chatJid}, 'contact', ${chatJid}, ${callId}, ${waTimestamp}, ${body}, 1, now())
    ON CONFLICT (chat_jid) DO UPDATE SET
      last_message_id = ${callId},
      last_message_at = ${waTimestamp},
      last_message_preview = ${body},
      unread_count = app_chats.unread_count + 1,
      updated_at = now()
  `.catch(() => {});

  logger.info(`[webhook] Call notification: ${from} (${isVideo ? 'video' : 'voice'})`);
  ssePush('message', {
    chatJid,
    message: {
      id: callId,
      chat_jid: chatJid,
      from_jid: from,
      from_me: false,
      message_type: messageType,
      body,
      wa_timestamp: waTimestamp,
      has_media: false,
      is_deleted: false,
    },
  });
  ssePush('chats', null);
}
