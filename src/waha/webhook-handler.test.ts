// Self-check untuk handler webhook: pastikan tiap event WA benar-benar
// menulis ke Postgres (chat, read/delivered, reaction, edit, delete).
// Butuh DATABASE_URL hidup. Jalankan: bun test
import { test, expect, beforeAll, afterAll } from 'bun:test';
import { handleWebhook } from './webhook-handler';
import { authorJidOf } from './extract';
import { getDb, closeDb, dbReady } from '@/db/client';

const TAG = `check_${Date.now()}`;
const CHAT = `${TAG}@c.us`;
const GROUP = `${TAG}_g@g.us`;
const MSG = `${TAG}_msg`;

let db: ReturnType<typeof getDb>;

beforeAll(async () => {
  await dbReady(1);
  db = getDb();
});

afterAll(async () => {
  await db`DELETE FROM app_message_receipts WHERE message_id = ${MSG}`;
  await db`DELETE FROM app_message_reactions WHERE message_id = ${MSG}`;
  await db`DELETE FROM app_message_edits WHERE message_id = ${MSG}`;
  await db`DELETE FROM app_message_status WHERE message_id = ${MSG}`;
  await db`DELETE FROM app_messages WHERE chat_jid IN (${CHAT}, ${GROUP})`;
  await db`DELETE FROM app_chats WHERE chat_jid IN (${CHAT}, ${GROUP})`;
  await closeDb();
});

test('message → app_messages + app_chats', async () => {
  await handleWebhook('message', {
    payload: { id: MSG, from: CHAT, fromMe: false, body: 'halo', timestamp: 1700000000, type: 'text' },
  });

  const rows = await db`SELECT body, from_me FROM app_messages WHERE id = ${MSG}`;
  expect(rows[0]?.body).toBe('halo');
  expect(rows[0]?.from_me).toBe(false);

  const chats = await db`SELECT last_message_preview, unread_count FROM app_chats WHERE chat_jid = ${CHAT}`;
  expect(chats[0]?.last_message_preview).toBe('halo');
  expect(chats[0]?.unread_count).toBe(1);
});

test('message duplikat (send → webhook) tidak menambah baris', async () => {
  // Jalur kirim menyimpan baris dengan id composite yang sama dengan yang
  // dikirim webhook, jadi webhook kedua harus kena ON CONFLICT.
  await handleWebhook('message', {
    payload: { id: MSG, from: CHAT, fromMe: true, body: 'halo', timestamp: 1700000001, type: 'text' },
  });

  const rows = await db`SELECT COUNT(*)::int AS n FROM app_messages WHERE id = ${MSG}`;
  expect(rows[0]?.n).toBe(1);
});

test('message grup: participant + quoted + tipe media + author', async () => {
  const groupMsgId = `${TAG}_gmsg`;
  await handleWebhook('message', {
    payload: {
      id: groupMsgId,
      from: GROUP,
      participant: 'sender@c.us',
      fromMe: false,
      body: 'caption',
      timestamp: 1700000001,
      hasMedia: true,
      media: { mimetype: 'image/jpeg', url: 'http://127.0.0.1:9/none' },
      replyTo: { id: MSG },
      _data: { pushName: 'Sender' },
    },
  });

  const rows = await db`
    SELECT from_jid, participant, message_type, has_media, media_mime, quoted_id
    FROM app_messages WHERE id = ${groupMsgId}
  `;
  expect(rows[0]?.from_jid).toBe('sender@c.us');
  expect(rows[0]?.participant).toBe('sender@c.us');
  expect(rows[0]?.message_type).toBe('image');
  expect(rows[0]?.has_media).toBe(true);
  expect(rows[0]?.media_mime).toBe('image/jpeg');
  expect(rows[0]?.quoted_id).toBe(MSG);

  const contacts = await db`SELECT push_name FROM app_contacts WHERE jid = 'sender@c.us'`;
  expect(contacts[0]?.push_name).toBe('Sender');

  await db`DELETE FROM app_contacts WHERE jid = 'sender@c.us'`;
  await db`DELETE FROM app_messages WHERE id = ${groupMsgId}`;
});

test('message.ack → app_message_status', async () => {
  await handleWebhook('message.ack', { payload: { id: MSG, from: CHAT, ack: 3 } });

  const rows = await db`SELECT status, read_at FROM app_message_status WHERE message_id = ${MSG}`;
  expect(rows[0]?.status).toBe('read');
  expect(rows[0]?.read_at).not.toBeNull();
});

test('message.ack.group → app_message_receipts (sufiks participant dibuang)', async () => {
  await handleWebhook('message.ack.group', {
    // WAHA menambahkan `_<participant>` ke id lewat buildMessageId().
    payload: { id: `${MSG}_p1@c.us`, from: GROUP, participant: 'p1@c.us', ack: 2 },
  });

  const rows = await db`SELECT message_id, status FROM app_message_receipts WHERE message_id = ${MSG}`;
  expect(rows.length).toBe(1);
  expect(rows[0]?.status).toBe('delivered');
});

test('message.reaction → set lalu hapus', async () => {
  // WAMessageReaction: reaction = { text, messageId }, id = id pesan reaksi.
  await handleWebhook('message.reaction', {
    payload: { id: `${MSG}_reaction`, from: CHAT, fromMe: false, reaction: { text: '👍', messageId: MSG } },
  });
  let rows = await db`SELECT emoji FROM app_message_reactions WHERE message_id = ${MSG}`;
  expect(rows[0]?.emoji).toBe('👍');

  await handleWebhook('message.reaction', {
    payload: { id: `${MSG}_reaction`, from: CHAT, fromMe: false, reaction: { text: '', messageId: MSG } },
  });
  rows = await db`SELECT emoji FROM app_message_reactions WHERE message_id = ${MSG}`;
  expect(rows.length).toBe(0);
});

test('message.edited → body + riwayat', async () => {
  await handleWebhook('message.edited', {
    payload: { id: `${MSG}_edit`, editedMessageId: MSG, from: CHAT, body: 'halo v2' },
  });

  const msg = await db`SELECT body, is_edited FROM app_messages WHERE id = ${MSG}`;
  expect(msg[0]?.body).toBe('halo v2');
  expect(msg[0]?.is_edited).toBe(true);

  const edits = await db`SELECT old_body, new_body FROM app_message_edits WHERE message_id = ${MSG}`;
  expect(edits[0]?.old_body).toBe('halo');
  expect(edits[0]?.new_body).toBe('halo v2');
});

test('message.revoked → is_deleted + deleted_at', async () => {
  // WAMessageRevokedBody: tidak ada id/from, target ada di revokedMessageId.
  await handleWebhook('message.revoked', {
    payload: { revokedMessageId: MSG, before: null, after: { id: `${MSG}_stub`, from: CHAT, fromMe: false } },
  });

  const rows = await db`SELECT is_deleted, deleted_at FROM app_messages WHERE id = ${MSG}`;
  expect(rows[0]?.is_deleted).toBe(true);
  expect(rows[0]?.deleted_at).not.toBeNull();
});

test('authorJidOf: author story diambil dari suffix id', () => {
  // Status@broadcast: WAHA tidak mengisi participant.
  expect(
    authorJidOf({ id: 'false_status@broadcast_ABC_96636864876644@lid' }, 'status@broadcast'),
  ).toBe('96636864876644@lid');
  // Grup: participant menang.
  expect(authorJidOf({ id: 'x', participant: 'p@c.us' }, 'g@g.us')).toBe('p@c.us');
  // Fallback Baileys key.
  expect(authorJidOf({ id: 'x', _data: { key: { participant: 'k@c.us' } } }, 'g@g.us')).toBe('k@c.us');
  // Id tanpa author → tetap chat_jid.
  expect(authorJidOf({ id: 'false_status@broadcast_HASH' }, 'status@broadcast')).toBe('status@broadcast');
});
