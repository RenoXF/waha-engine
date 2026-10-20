import { Elysia } from 'elysia';
import { passwordMatches, sessionToken, tokenIsValid, SELF } from '@/auth';
import { logger } from '@/logger';

// Login tetap menerima { username, password } karena form UI tidak diubah.
// Username diabaikan: satu password bersama untuk semua orang.
export const authRoutes = new Elysia({ prefix: '/auth' })
  .post('/login', ({ body, cookie: { waha_session } }) => {
    const { password } = (body || {}) as { password?: string };

    if (!passwordMatches(password)) {
      logger.warn('[auth] Login gagal');
      return Response.json({ error: 'Invalid password' }, { status: 401 });
    }

    waha_session!.set({
      value: sessionToken(),
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    logger.info('[auth] Login berhasil');
    return { success: true, data: SELF };
  })

  .post('/logout', ({ cookie: { waha_session } }) => {
    waha_session!.remove();
    return { success: true };
  })

  .get('/me', ({ cookie: { waha_session } }) => {
    if (!tokenIsValid(waha_session?.value)) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }
    return { success: true, data: SELF };
  });
