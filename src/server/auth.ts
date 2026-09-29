import { Elysia, t } from 'elysia';
import { createToken, verifyToken, hashPassword, verifyPassword } from '@/auth';
import { checkRateLimit } from '@/auth/rate-limit';
import { getDb } from '@/db/client';
import { config } from '@/config';
import { logger } from '@/logger';

export const authRoutes = new Elysia({ prefix: '/auth' })
  // POST /auth/login
  .post('/login', async ({ request, cookie: { waha_session } }) => {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const { ok, retryAfterMs } = checkRateLimit(ip);
    if (!ok) {
      return Response.json(
        { error: 'Too many attempts', retryAfterMs },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { username, password } = body as { username: string; password: string };

    if (!username || !password) {
      return Response.json({ error: 'Username and password required' }, { status: 400 });
    }

    const db = getDb();
    const users = await db`
      SELECT id, username, password_hash, role, is_active
      FROM app_users WHERE username = ${username} LIMIT 1
    `;

    if (users.length === 0) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const user = users[0];
    if (!user.is_active) {
      return Response.json({ error: 'Account disabled' }, { status: 403 });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = await createToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    waha_session.set({
      value: token,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    logger.info(`[auth] Login: ${username}`);
    return { success: true, data: { userId: user.id, username: user.username, role: user.role } };
  })

  // POST /auth/logout
  .post('/logout', ({ cookie: { waha_session } }) => {
    waha_session.remove();
    return { success: true };
  })

  // GET /auth/me
  .get('/me', async ({ request, cookie: { waha_session } }) => {
    const token = waha_session.value || new URL(request.url).searchParams.get('token');
    if (!token) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return Response.json({ error: 'Invalid token' }, { status: 401 });
    }

    return { success: true, data: user };
  });
