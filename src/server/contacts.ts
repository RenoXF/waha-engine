import { Elysia } from 'elysia';
import { getDb } from '@/db/client';

export const contactRoutes = new Elysia({ prefix: '/contacts' })
  .get('/', async () => {
    const db = getDb();
    const contacts = await db`
      SELECT c.*, cl.last_message_at, cl.last_message_preview
      FROM app_contacts c
      LEFT JOIN app_chats cl ON c.jid = cl.chat_jid
      ORDER BY c.push_name ASC NULLS LAST
    `;
    return { success: true, data: contacts };
  })

  .get('/:jid', async ({ params }) => {
    const db = getDb();
    const contact = await db`SELECT * FROM app_contacts WHERE jid = ${params.jid} LIMIT 1`;
    if (contact.length === 0) {
      return Response.json({ error: 'Contact not found' }, { status: 404 });
    }
    return { success: true, data: contact[0] };
  });
