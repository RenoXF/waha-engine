// WAHA's WAMessage has no `type` field (lihat structures/responses.dto.ts).
// Media bisa gagal di-download, jadi mimetype saja tidak cukup — fallback ke
// key mentah Baileys di `_data.message`.
type Raw = Record<string, any>;

export function messageTypeOf(msg: Raw): string {
  const mime = String(msg.media?.mimetype ?? '');
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime) return 'document';

  const raw: Raw = msg._data?.message ?? {};
  if (raw.imageMessage || raw.stickerMessage) return 'image';
  if (raw.videoMessage) return 'video';
  if (raw.audioMessage) return 'audio';
  if (raw.documentMessage) return 'document';
  if (raw.locationMessage) return 'location';
  if (raw.contactMessage || raw.contactsArrayMessage) return 'contact';
  return 'text';
}

// Grup: pengirim asli ada di `participant`. Status@broadcast: WAHA tidak
// mengisi participant — author hanya ada di segmen terakhir id
// (`false_status@broadcast_<hash>_<authorJid>`) dan di `_data.key.participant`.
export function authorJidOf(msg: Raw, chatJid: string): string {
  const participant =
    (msg.participant as string) || (msg._data?.key?.participant as string) || '';
  if (participant) return participant;

  if (chatJid === 'status@broadcast') {
    const tail = String(msg.id ?? '').split('_').pop() ?? '';
    if (tail.includes('@')) return tail;
  }
  return chatJid;
}

export function quotedIdOf(msg: Raw): string | null {
  return (msg.replyTo as Raw | null)?.id ?? null;
}
