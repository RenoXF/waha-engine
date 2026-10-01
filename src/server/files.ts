import { Elysia } from 'elysia';
import { join } from 'path';
import { stat } from 'fs/promises';
import * as waha from '@/waha/client';
import { logger } from '@/logger';

const MEDIA_DIR = join(import.meta.dir, '../../Media');
const ALLOWED_TYPES = ['picture', 'video', 'audio', 'document', 'contact_avatar'];

export const filesRoutes = new Elysia()
  .get('/files/:type/:filename', async ({ params }) => {
    const { type, filename } = params;
    if (!ALLOWED_TYPES.includes(type)) return new Response('Invalid type', { status: 400 });
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return new Response('Invalid filename', { status: 400 });
    }
    const filePath = join(MEDIA_DIR, type, filename);
    try { await stat(filePath); } catch { return new Response('Not found', { status: 404 }); }
    const file = Bun.file(filePath);
    return new Response(file, {
      headers: { 'Cache-Control': 'private, max-age=86400', 'Content-Type': file.type || 'application/octet-stream' },
    });
  })

  .get('/files/download/:messageId', async ({ params }) => {
    try {
      const file = await waha.getFile(params.messageId);
      if (!file?.url) return new Response('Not available', { status: 404 });
      const res = await fetch(file.url);
      if (!res.ok) return new Response('Download failed', { status: 502 });
      const buffer = await res.arrayBuffer();
      return new Response(buffer, {
        headers: { 'Content-Type': file.mimetype || 'application/octet-stream', 'Cache-Control': 'private, max-age=86400' },
      });
    } catch (err) {
      logger.error(err, `[files] Download failed: ${params.messageId}`);
      return new Response('Download failed', { status: 500 });
    }
  });
