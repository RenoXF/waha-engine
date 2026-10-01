import { Elysia } from 'elysia';
import { join } from 'path';
import { stat } from 'fs/promises';
import { getDb } from '@/db/client';

const LOCAL_MEDIA_DIR = join(import.meta.dir, '../../waha/.media');
const APP_MEDIA_DIR = join(import.meta.dir, '../../Media');
const ALLOWED_TYPES = ['picture', 'video', 'audio', 'document', 'contact_avatar'];

export const filesRoutes = new Elysia()
  // Serve local app media files
  .get('/files/:type/:filename', async ({ params }) => {
    const { type, filename } = params;
    if (!ALLOWED_TYPES.includes(type)) return new Response('Invalid type', { status: 400 });
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return new Response('Invalid filename', { status: 400 });
    }
    const filePath = join(APP_MEDIA_DIR, type, filename);
    try { await stat(filePath); } catch { return new Response('Not found', { status: 404 }); }
    const file = Bun.file(filePath);
    return new Response(file, {
      headers: { 'Cache-Control': 'private, max-age=86400', 'Content-Type': file.type || 'application/octet-stream' },
    });
  })

  // Serve media: check DB media_path first, then WAHA .media/, then local Media/
  .get('/files/download/:messageId', async ({ params }) => {
    const { messageId } = params;
    if (messageId.includes('..') || messageId.includes('/') || messageId.includes('\\')) {
      return new Response('Invalid ID', { status: 400 });
    }

    // 1. Try DB media_path first
    try {
      const db = getDb();
      const rows = await db`SELECT media_path FROM app_messages WHERE id = ${messageId} LIMIT 1`;
      if (rows[0]?.media_path) {
        const filePath = join(import.meta.dir, '../../..', rows[0].media_path);
        try {
          await stat(filePath);
          const file = Bun.file(filePath);
          return new Response(file, {
            headers: { 'Cache-Control': 'private, max-age=86400', 'Content-Type': file.type || 'application/octet-stream' },
          });
        } catch {}
      }
    } catch {}

    // 2. Try WAHA .media/{session}/
    const exts = ['jpeg', 'jpg', 'png', 'webp', 'mp4', 'ogg', 'opus', 'pdf', 'mp3', 'gif', 'webm'];
    for (const ext of exts) {
      const filePath = join(LOCAL_MEDIA_DIR, 'default', `${messageId}.${ext}`);
      try {
        await stat(filePath);
        const file = Bun.file(filePath);
        return new Response(file, {
          headers: { 'Cache-Control': 'private, max-age=86400', 'Content-Type': file.type || 'application/octet-stream' },
        });
      } catch {}
    }

    // 3. Try clean ID (extract last part after _)
    const parts = messageId.split('_');
    const cleanId = parts.length >= 3 ? parts[2] : messageId;
    const types = ['picture', 'video', 'audio', 'document'];
    for (const type of types) {
      for (const ext of exts) {
        const filePath = join(APP_MEDIA_DIR, type, `${cleanId}.${ext}`);
        try {
          await stat(filePath);
          const file = Bun.file(filePath);
          return new Response(file, {
            headers: { 'Cache-Control': 'private, max-age=86400', 'Content-Type': file.type || 'application/octet-stream' },
          });
        } catch {}
      }
    }

    return new Response('Media not found', { status: 404 });
  });
