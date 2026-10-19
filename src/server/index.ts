import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { join, normalize } from 'path';
import { config } from '@/config';
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

// ponytail: manual static serve karena @elysiajs/static ketimpa .get('/*').
// Naik ke staticPlugin + onAfterHandle 404->index.html kalau Elysia expose onNotFound.
const WEB_DIST = join(import.meta.dir, '../web/dist');
const INDEX_HTML = Bun.file(join(WEB_DIST, 'index.html'));

export function createServer() {
  return new Elysia()
    .use(cors({ origin: config.corsOrigins, credentials: true }))
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
    .get('/*', async ({ request }) => {
      const raw = decodeURIComponent(new URL(request.url).pathname);
      const full = join(WEB_DIST, normalize(raw));
      if (!full.startsWith(WEB_DIST)) return new Response('forbidden', { status: 403 });
      const file = Bun.file(full);
      // content-type wajib eksplisit: plugin cors() Elysia menstrip header yang
      // di-infer otomatis dari BunFile, hasilnya module script ditolak browser
      // ("Expected a JavaScript-or-Wasm module script").
      if (normalize(raw) !== '/' && (await file.exists())) {
        return new Response(file, { headers: { 'content-type': file.type } });
      }
      return new Response(INDEX_HTML, {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    })
    .get('/health', () => ({ status: 'ok', uptime: process.uptime() }))
    .listen(config.port, () => console.log(`Server running at port ${config.port}`));
}
