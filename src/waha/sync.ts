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

  // Guard: only sync when session is WORKING
  try {
    const status = await waha.getSession(session) as { status?: string };
    if (status?.status !== 'WORKING') {
      logger.debug(`[sync] Skipped — session status: ${status?.status}`);
      return;
    }
  } catch {
    logger.debug('[sync] Skipped — session not reachable');
    return;
  }

  logger.info('[sync] Pulling chats from WAHA...');

  // 0. Sync contacts first
  try {
    const contactsRes = await waha.getContacts(session) as { data?: any[] } | any[];
    const contacts = Array.isArray(contactsRes) ? contactsRes : contactsRes?.data || [];
    logger.info(`[sync] Found ${contacts.length} contacts`);

    for (const c of contacts) {
      const jid = c.id || c.jid;
      if (!jid) continue;
      // WAHA kirim 'pushname' (p kecil) dan 'phoneNumber' — bukan 'pushName'.
      const pushName = c.name || c.pushname || null;
      // WAHA memakai tiga bentuk jid: @s.whatsapp.net, @c.us (nomor asli),
      // dan @lid (identifier opaque, BUKAN nomor telepon). Dua yang pertama
      // adalah nomor asli dan harus diparse; @lid tidak bisa.
      const [idPart, suffix = ''] = jid.split('@');
      const fromJid = suffix === 'c.us' || suffix === 's.whatsapp.net' ? idPart : null;
      // phoneNumber dari WAHA lebih akurat daripada mem-parse jid: tersedia
      // juga untuk kontak @lid yang jid-nya bukan nomor.
      const fromPhoneNumber = c.phoneNumber
        ? String(c.phoneNumber).split('@')[0]
        : null;
      const phone = fromPhoneNumber || fromJid;

      await db`
        INSERT INTO app_contacts (jid, phone, push_name, synced_at, updated_at)
        VALUES (${jid}, ${phone}, ${pushName}, now(), now())
        ON CONFLICT (jid) DO UPDATE SET
          phone = COALESCE(EXCLUDED.phone, app_contacts.phone),
          push_name = COALESCE(EXCLUDED.push_name, app_contacts.push_name),
          synced_at = now(),
          updated_at = now()
      `.catch((e) => logger.warn(e, `[sync] insert contact ${jid} gagal`));
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
      `.catch((e) => logger.warn(e, `[sync] insert lid ${m.lid} gagal`));
    }

    // 73% kontak dari WAHA datang berjid @lid, bukan @s.whatsapp.net, jadi
    // kolom phone di atas tetap null. Isi dari mapping yang baru synced.
    await db`
      UPDATE app_contacts c
      SET phone = m.pn, updated_at = now()
      FROM app_lid_pn_mapping m
      WHERE c.jid = m.lid AND c.phone IS NULL AND m.pn IS NOT NULL
    `;
    // postgres.js tidak mengembalikan jumlah baris untuk UPDATE, jadi hitung
    // sisa yang belum punya phone.
    const missing = await db<{ n: number }[]>`
      SELECT count(*)::int AS n FROM app_contacts WHERE phone IS NULL
    `;
    logger.info(`[sync] Contacts without phone after LID join: ${missing[0]?.n ?? '?'}`);
  } catch (e) {
    logger.error(e, '[sync] Failed to sync LID mappings');
  }

  // 1. Sync groups + participants (WAHA balas object ber-key, bukan array)
  try {
    const groupsRes = await waha.getGroups(session) as Record<string, any> | any[];
    const groups = Array.isArray(groupsRes)
      ? groupsRes
      : Object.values(groupsRes || {});
    logger.info(`[sync] Found ${groups.length} groups`);

    for (const g of groups) {
      const groupJid = g.id || g.jid;
      if (!groupJid) continue;

      await db`
        INSERT INTO app_groups (group_jid, subject, description, owner_jid, participant_count, updated_at)
        VALUES (${groupJid}, ${g.subject ?? null}, ${g.description ?? null}, ${g.owner ?? null}, ${g.size ?? 0}, now())
        ON CONFLICT (group_jid) DO UPDATE SET
          subject = COALESCE(EXCLUDED.subject, app_groups.subject),
          description = COALESCE(EXCLUDED.description, app_groups.description),
          owner_jid = COALESCE(EXCLUDED.owner_jid, app_groups.owner_jid),
          participant_count = EXCLUDED.participant_count,
          updated_at = now()
      `.catch((e) => logger.warn(e, `[sync] upsert group ${groupJid} gagal`));

      try {
        const parts = await waha.getGroupParticipants(session, groupJid);
        const list = Array.isArray(parts) ? parts : [];
        for (const p of list) {
          const pJid = p.id;
          if (!pJid) continue;
          await db`
            INSERT INTO app_group_participants (group_jid, participant_jid, is_admin)
            VALUES (${groupJid}, ${pJid}, ${p.admin === true})
            ON CONFLICT (group_jid, participant_jid) DO UPDATE SET is_admin = EXCLUDED.is_admin
          `.catch((e) => logger.warn(e, `[sync] insert participant ${pJid} gagal`));
        }
      } catch (e) {
        logger.warn(e, `[sync] participants ${groupJid} gagal`);
      }
    }
  } catch (e) {
    logger.error(e, '[sync] Failed to sync groups');
  }

  // 2. Get chat list
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

    // 2b. Get messages for this chat (last 100)
    try {
      // downloadMedia=false — history media keys are expired, downloading causes
      // WAHA to spam reupload requests to the phone (403 / bad decrypt).
      const msgsRes = await waha.getMessages(session, chatJid, 100, false) as { data?: any[] } | any[];
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
          ON CONFLICT (id) DO NOTHING
        `.catch((e) => logger.warn(e, `[sync] insert message ${msgId} gagal`));

        // Update chat preview
        if (body) {
          await db`
            UPDATE app_chats SET
              last_message_id = ${msgId},
              last_message_at = ${waTimestamp},
              last_message_preview = ${body.substring(0, 100)},
              updated_at = now()
            WHERE chat_jid = ${chatJid}
          `.catch((e) => logger.warn(e, `[sync] update preview ${chatJid} gagal`));
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
