import { Elysia } from 'elysia';
import { tokenIsValid } from '@/auth';
import { logger } from '@/logger';

// Route yang boleh tanpa login:
//   /auth/*   -> login harus bisa dipanggil tanpa sudah login
//   /webhook  -> WAHA yang initiating, bukan user
// SPA statis di-register SEBELUM guard ini, jadi tidak ikut kena.
const PUBLIC_PREFIXES = ['/auth', '/webhook'];

const covers = (path: string, prefixes: string[]) =>
  prefixes.some((p) => path === p || path.startsWith(p + '/'));

// ponytail: scoped, jadi hanya route yang di-register SETELAH .use(authGuard) yang
// terlindungi. Kalau nambah route API baru, taruh setelah baris itu.
export const authGuard = new Elysia({ name: 'auth-guard' }).onBeforeHandle(
  { as: 'scoped' },
  ({ path, request, cookie: { waha_session }, status }) => {
    if (covers(path, PUBLIC_PREFIXES)) return;
    if (tokenIsValid(waha_session?.value)) return;

    logger.warn(`[auth] 401 ${request.method} ${path}`);
    return status(401, { error: 'Unauthorized' });
  }
);
