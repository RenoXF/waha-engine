import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
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

export function createServer() {
  return new Elysia()
    .use(cors({ credentials: true }))
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
    .get('/health', () => ({ status: 'ok', uptime: process.uptime() }))
    .listen(config.port);
}
