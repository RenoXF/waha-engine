import { Elysia } from 'elysia';
import { join, normalize } from 'path';
import { config } from '@/config';
import { getDb } from '@/db/client';
import { authRoutes } from './auth';
import { webhookRoutes } from './webhook';
import { sseRoutes } from './sse';
import { sessionRoutes } from './session';
import { messageRoutes } from './messages';
import { contactRoutes } from './contacts';
import { groupRoutes } from './groups';
import { filesRoutes } from './files';
import { userRoutes } from './users';
import { presenceRoutes } from './presence';
import { authGuard } from './auth-guard';

// ponytail: manual static serve karena @elysiajs/static ketimpa .get('/*').
// Naik ke staticPlugin + onAfterHandle 404->index.html kalau Elysia expose onNotFound.
const WEB_DIST = join(import.meta.dir, '../web/dist');
const INDEX_HTML = Bun.file(join(WEB_DIST, 'index.html'));

// Path API yang tidak dikenal harus 404, bukan index.html 200. Wildcard
// statis didaftarkan sebelum guard, jadi tanpa ini GET /api/typo balas HTML.
const API_PREFIXES = [
  '/api', '/auth', '/webhook', '/sse', '/files', '/messages',
  '/contacts', '/groups', '/session', '/users', '/presence', '/logs', '/health',
];

const isApiPath = (path: string) =>
  API_PREFIXES.some((p) => path === p || path.startsWith(p + '/'));

export function createServer() {
  return new Elysia()
    .get('/health', () => ({ status: 'ok', uptime: process.uptime() }))
    .get('/*', async ({ request }) => {
      const raw = decodeURIComponent(new URL(request.url).pathname);
      const full = join(WEB_DIST, normalize(raw));
      if (!full.startsWith(WEB_DIST)) return new Response('forbidden', { status: 403 });
      const file = Bun.file(full);
      // content-type wajib eksplisit: header yang di-infer otomatis dari BunFile
      // bisa hilang dan module script ditolak browser
      // ("Expected a JavaScript-or-Wasm module script").
      if (normalize(raw) !== '/' && (await file.exists())) {
        return new Response(file, { headers: { 'content-type': file.type } });
      }
      if (isApiPath(raw)) return new Response('Not found', { status: 404 });
      return new Response(INDEX_HTML, {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    })
    // Semua route API di bawah wajib login. Letakkan route baru setelah baris ini.
    .use(authGuard)
    // Log error/warning dari DB — untuk pantau tanpa buka terminal.
    // GET /logs?level=error&limit=100
    .get('/logs', async ({ query }) => {
      const db = getDb();
      const level = query.level ? String(query.level) : null;
      const limit = Math.min(Number(query.limit) || 100, 500);
      const rows = level
        ? await db`SELECT * FROM app_logs WHERE level = ${level} ORDER BY id DESC LIMIT ${limit}`
        : await db`SELECT * FROM app_logs ORDER BY id DESC LIMIT ${limit}`;
      return { success: true, data: rows };
    })
    .use(authRoutes)
    .use(webhookRoutes)
    .use(sseRoutes)
    .use(sessionRoutes)
    .use(messageRoutes)
    .use(contactRoutes)
    .use(groupRoutes)
    .use(filesRoutes)
    .use(userRoutes)
    .use(presenceRoutes)
    .listen({ port: config.port, hostname: config.host }, () =>
      console.log(`Server running at ${config.host}:${config.port}`)
    );
}
