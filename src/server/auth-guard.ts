import { Elysia } from 'elysia';
import { verifyToken } from '@/auth';
import { logger } from '@/logger';

// Route yang boleh tanpa login:
//   /auth/*   -> login harus bisa dipanggil tanpa sudah login
//   /webhook  -> WAHA yang initiating, bukan user
// SPA statis di-register SEBELUM guard ini, jadi tidak ikut kena.
const PUBLIC_PREFIXES = ['/auth', '/webhook'];

// Manage user hanya untuk admin.
const ADMIN_PREFIXES = ['/users'];

const covers = (path: string, prefixes: string[]) =>
  prefixes.some((p) => path === p || path.startsWith(p + '/'));

// ponytail: scoped, jadi hanya route yang di-register SETELAH .use(authGuard) yang
// terlindungi. Kalau nambah route API baru, taruh setelah baris itu.
export const authGuard = new Elysia({ name: 'auth-guard' }).onBeforeHandle(
  { as: 'scoped' },
  async ({ path, request, cookie: { waha_session }, status }) => {
    if (covers(path, PUBLIC_PREFIXES)) return;

    const cookieToken = waha_session?.value;
    const token =
      (typeof cookieToken === 'string' ? cookieToken : null) ||
      new URL(request.url).searchParams.get('token');
    const user = token ? await verifyToken(token) : null;

    if (!user) {
      logger.warn(`[auth] 401 ${request.method} ${path}`);
      return status(401, { error: 'Unauthorized' });
    }

    if (covers(path, ADMIN_PREFIXES) && user.role !== 'admin') {
      logger.warn(`[auth] 403 ${request.method} ${path} role=${user.role}`);
      return status(403, { error: 'Forbidden' });
    }
  }
);
