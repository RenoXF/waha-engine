import { Elysia } from 'elysia';
import { join } from 'path';
import { stat } from 'fs/promises';

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

  // Serve media: check WAHA .media/ then local Media/
  .get('/files/download/:messageId', async ({ params }) => {
    const { messageId } = params;
    if (messageId.includes('..') || messageId.includes('/') || messageId.includes('\\')) {
      return new Response('Invalid ID', { status: 400 });
    }

    const exts = ['jpeg', 'jpg', 'png', 'webp', 'mp4', 'ogg', 'opus', 'pdf', 'mp3', 'gif', 'webm'];
    const types = ['picture', 'video', 'audio', 'document'];

    // 1. Try WAHA .media/{session}/
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

    // 2. Try local Media/{type}/
    for (const type of types) {
      for (const ext of exts) {
        const filePath = join(APP_MEDIA_DIR, type, `${messageId}.${ext}`);
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
