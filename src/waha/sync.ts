import { getDb } from '@/db/client';
import * as waha from './client';
import { ssePush } from './sse-pubsub';
import { config } from '@/config';
import { logger } from '@/logger';

/**
 * Pull chat list + messages from WAHA store and upsert to our DB.
 * Call this when session status = WORKING.
 */
export async function syncFromWaha(): Promise<void> {
  const session = config.wahaSessionName;
  const db = getDb();

  logger.info('[sync] Pulling chats from WAHA...');

  // 0. Sync contacts first
  try {
    const contactsRes = await waha.getContacts(session) as { data?: any[] } | any[];
    const contacts = Array.isArray(contactsRes) ? contactsRes : contactsRes?.data || [];
    logger.info(`[sync] Found ${contacts.length} contacts`);

    for (const c of contacts) {
      const jid = c.id || c.jid;
      if (!jid) continue;
      const pushName = c.name || c.pushName || null;
      const phone = jid.includes('@s.whatsapp.net') ? jid.split('@')[0] : null;

      await db`
        INSERT INTO app_contacts (jid, phone, push_name, synced_at, updated_at)
        VALUES (${jid}, ${phone}, ${pushName}, now(), now())
        ON CONFLICT (jid) DO UPDATE SET
          phone = COALESCE(EXCLUDED.phone, app_contacts.phone),
          push_name = COALESCE(EXCLUDED.push_name, app_contacts.push_name),
          synced_at = now(),
          updated_at = now()
      `.catch(() => {});
    }
  } catch (e) {
    logger.error(e, '[sync] Failed to sync contacts');
  }

  // 0b. Sync LID → PN mapping
  try {
    const lids = await waha.getAllLids(session) as Array<{ lid: string; pn: string | null }>;
    const list = Array.isArray(lids) ? lids : [];
    logger.info(`[sync] Found ${list.length} LID mappings`);

    for (const m of list) {
      if (!m.lid || !m.pn) continue;
      await db`
        INSERT INTO app_lid_pn_mapping (lid, pn, updated_at)
        VALUES (${m.lid}, ${m.pn}, now())
        ON CONFLICT (lid) DO UPDATE SET pn = EXCLUDED.pn, updated_at = now()
      `.catch(() => {});
    }
  } catch (e) {
    logger.error(e, '[sync] Failed to sync LID mappings');
  }

  // 1. Get chat list
  const chatsRes = await waha.getChats(session) as { data?: any[] } | any[];
  const chats = Array.isArray(chatsRes) ? chatsRes : chatsRes?.data || [];

  logger.info(`[sync] Found ${chats.length} chats`);

  for (const chat of chats) {
    const chatJid = chat.id || chat.jid || chat.chatId;
    if (!chatJid) continue;

    const chatType = chatJid.includes('@g.us') ? 'group' : 'contact';
    const name = chat.name || chat.subject || chatJid;

    // Upsert chat
    await db`
      INSERT INTO app_chats (chat_jid, chat_type, name, updated_at)
      VALUES (${chatJid}, ${chatType}, ${name}, now())
      ON CONFLICT (chat_jid) DO UPDATE SET
        name = COALESCE(EXCLUDED.name, app_chats.name),
        updated_at = now()
    `.catch((e) => logger.error(e, `[sync] Failed upsert chat ${chatJid}`));

    // 2. Get messages for this chat (last 100)
    try {
      const msgsRes = await waha.getMessages(session, chatJid, 100) as { data?: any[] } | any[];
      const messages = Array.isArray(msgsRes) ? msgsRes : msgsRes?.data || [];

      for (const msg of messages) {
        const msgId = msg.id;
        if (!msgId) continue;

        const fromMe = msg.fromMe || false;
        const body = msg.body || msg.caption || null;
        const timestamp = msg.timestamp;
        const waTimestamp = timestamp ? new Date(timestamp * 1000).toISOString() : new Date().toISOString();
        const fromJid = msg.from || null;

        // Extract media info
        const media = msg.media || null;
        const hasMedia = !!media;
        const mediaMime = media?.mimetype || null;
        const mediaUrl = media?.url || null;
        const mediaFilename = media?.filename || null;
        const mediaSize = media?.filesize || null;

        // Detect message type
        let messageType = msg.type || 'text';
        if (hasMedia && mediaMime) {
          if (mediaMime.startsWith('image/')) messageType = 'image';
          else if (mediaMime.startsWith('video/')) messageType = 'video';
          else if (mediaMime.startsWith('audio/')) messageType = 'audio';
          else messageType = 'document';
        }

        await db`
          INSERT INTO app_messages (id, chat_jid, from_jid, from_me, message_type, body, wa_timestamp, has_media, media_mime, media_filename, media_size)
          VALUES (${msgId}, ${chatJid}, ${fromJid}, ${fromMe}, ${messageType}, ${body}, ${waTimestamp}, ${hasMedia}, ${mediaMime}, ${mediaFilename}, ${mediaSize})
          ON CONFLICT (id, chat_jid) DO NOTHING
        `.catch(() => {});

        // Update chat preview
        if (body) {
          await db`
            UPDATE app_chats SET
              last_message_id = ${msgId},
              last_message_at = ${waTimestamp},
              last_message_preview = ${body.substring(0, 100)},
              updated_at = now()
            WHERE chat_jid = ${chatJid}
          `.catch(() => {});
        }
      }

      logger.info(`[sync] Chat ${chatJid}: ${messages.length} messages`);
    } catch (e) {
      logger.error(e, `[sync] Failed get messages for ${chatJid}`);
    }
  }

  logger.info('[sync] Complete');
  ssePush('chats', null);
}
