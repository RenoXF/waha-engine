import { Elysia } from 'elysia';
import { getDb } from '@/db/client';

export const groupRoutes = new Elysia({ prefix: '/groups' })
  .get('/', async () => {
    const db = getDb();
    const groups = await db`SELECT * FROM app_groups ORDER BY subject ASC NULLS LAST`;
    return { success: true, data: groups };
  })

  .get('/:id', async ({ params }) => {
    const db = getDb();
    const group = await db`SELECT * FROM app_groups WHERE group_jid = ${params.id} LIMIT 1`;
    if (group.length === 0) {
      return Response.json({ error: 'Group not found' }, { status: 404 });
    }
    return { success: true, data: group[0] };
  })

  .get('/:id/participants', async ({ params }) => {
    const db = getDb();
    const participants = await db`
      SELECT gp.*, c.push_name, c.avatar_path
      FROM app_group_participants gp
      LEFT JOIN app_contacts c ON gp.participant_jid = c.jid
      WHERE gp.group_jid = ${params.id}
    `;
    return { success: true, data: participants };
  });
