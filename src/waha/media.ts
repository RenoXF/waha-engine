import { mkdir } from 'fs/promises';
import { join } from 'path';
import { config } from '@/config';
import { getDb } from '@/db/client';
import { logger } from '@/logger';

const MEDIA_DIR = join(import.meta.dir, '../../Media');

const TYPE_MAP: Record<string, string> = {
  'image/': 'picture',
  'video/': 'video',
  'audio/': 'audio',
  'application/pdf': 'document',
};

export function getMediaType(mime: string | null): string {
  if (!mime) return 'document';
  for (const [prefix, type] of Object.entries(TYPE_MAP)) {
    if (mime.startsWith(prefix)) return type;
  }
  return 'document';
}

export function getExtension(mime: string | null): string {
  if (!mime) return 'bin';
  const ext: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'audio/ogg': 'ogg',
    'audio/opus': 'opus',
    'audio/mpeg': 'mp3',
    'application/pdf': 'pdf',
  };
  return ext[mime] || 'bin';
}

const ALLOWED_DIRS = ['picture', 'video', 'audio', 'document', 'contact_avatar'];

/** Write a file into Media/{type}/ and return the DB-relative path. */
export async function storeLocalFile(mediaType: string, filename: string, data: Blob): Promise<string> {
  if (!ALLOWED_DIRS.includes(mediaType)) throw new Error(`Invalid media type: ${mediaType}`);
  if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    throw new Error(`Invalid filename: ${filename}`);
  }
  const dir = join(MEDIA_DIR, mediaType);
  await mkdir(dir, { recursive: true });
  await Bun.write(join(dir, filename), data);
  return `Media/${mediaType}/${filename}`;
}

export async function downloadAndStoreMedia(messageId: string, mediaUrl: string, mediaMime: string | null): Promise<void> {
  const db = getDb();
  const mediaType = getMediaType(mediaMime);
  const ext = getExtension(mediaMime);

  // Clean filename: extract just the message ID part
  // Format: false_chatId_MSGID_senderLid → just MSGID
  const parts = messageId.split('_');
  const cleanId = parts.length >= 3 ? parts[2] : messageId.replace(/[^a-zA-Z0-9]/g, '');

  const dir = join(MEDIA_DIR, mediaType);
  const filename = `${cleanId}.${ext}`;
  const filePath = join(dir, filename);

  // Create directory if needed
  await mkdir(dir, { recursive: true });

  // Download from WAHA
  const res = await fetch(mediaUrl, {
    headers: { 'X-API-Key': config.wahaApiKey },
  });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);

  const buffer = await res.arrayBuffer();
  await Bun.write(filePath, buffer);

  // Update DB with media path
  const relativePath = `Media/${mediaType}/${filename}`;
  await db`
    UPDATE app_messages SET media_path = ${relativePath}, updated_at = now()
    WHERE id = ${messageId}
  `;

  logger.info(`[media] Stored: ${relativePath} (${buffer.byteLength} bytes)`);
}
