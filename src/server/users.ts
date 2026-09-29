import { Elysia } from 'elysia';
import { getDb } from '@/db/client';
import { hashPassword } from '@/auth';

export const userRoutes = new Elysia({ prefix: '/users' })
  .get('/', async () => {
    const db = getDb();
    const users = await db`
      SELECT id, username, role, is_active, created_at, updated_at
      FROM app_users ORDER BY created_at ASC
    `;
    return { success: true, data: users };
  })

  .post('/', async ({ request }) => {
    const body = await request.json();
    const { username, password, role } = body as { username: string; password: string; role?: string };

    if (!username || !password) {
      return Response.json({ error: 'username and password required' }, { status: 400 });
    }

    const db = getDb();
    const hash = await hashPassword(password);

    try {
      const user = await db`
        INSERT INTO app_users (username, password_hash, role)
        VALUES (${username}, ${hash}, ${role || 'agent'})
        RETURNING id, username, role, is_active
      `;
      return { success: true, data: user[0] };
    } catch (err) {
      if (String(err).includes('unique')) {
        return Response.json({ error: 'Username already exists' }, { status: 409 });
      }
      throw err;
    }
  })

  .patch('/:id', async ({ params, request }) => {
    const body = await request.json();
    const { displayName, isActive, role, password } = body as Record<string, unknown>;
    const db = getDb();

    if (password) {
      const hash = await hashPassword(password as string);
      await db`UPDATE app_users SET password_hash = ${hash}, updated_at = now() WHERE id = ${params.id}`;
    }
    if (typeof isActive === 'boolean') {
      await db`UPDATE app_users SET is_active = ${isActive}, updated_at = now() WHERE id = ${params.id}`;
    }
    if (role) {
      await db`UPDATE app_users SET role = ${role}, updated_at = now() WHERE id = ${params.id}`;
    }

    return { success: true };
  })

  .delete('/:id', async ({ params }) => {
    const db = getDb();
    await db`DELETE FROM app_users WHERE id = ${params.id}`;
    return { success: true };
  });
