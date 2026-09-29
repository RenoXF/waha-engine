import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';

export function createServer() {
  return new Elysia()
    .use(cors({ credentials: true }))
    .get('/health', () => ({ status: 'ok', uptime: process.uptime() }))
    .listen(4000);
}
