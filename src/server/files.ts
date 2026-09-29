import { Elysia } from 'elysia';
import { join } from 'path';
import { stat, readFile } from 'fs/promises';

const MEDIA_DIR = join(import.meta.dir, '../../Media');

const ALLOWED_TYPES = ['picture', 'video', 'audio', 'document', 'contact_avatar'];

export const filesRoutes = new Elysia()
  .get('/files/:type/:filename', async ({ params }) => {
    const { type, filename } = params;

    if (!ALLOWED_TYPES.includes(type)) {
      return new Response('Invalid type', { status: 400 });
    }

    // Path traversal protection
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return new Response('Invalid filename', { status: 400 });
    }

    const filePath = join(MEDIA_DIR, type, filename);

    try {
      await stat(filePath);
    } catch {
      return new Response('Not found', { status: 404 });
    }

    const file = Bun.file(filePath);
    return new Response(file, {
      headers: {
        'Cache-Control': 'private, max-age=86400',
        'Content-Type': file.type || 'application/octet-stream',
      },
    });
  });
