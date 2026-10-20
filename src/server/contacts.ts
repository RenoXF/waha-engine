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
  })

  // POST /contacts/custom-name — ganti nama tampilan lokal (tidak menulis ke HP)
  .post('/custom-name', async ({ request }) => {
    const body = await request.json();
    const { jid, name } = body as { jid: string; name?: string | null };
    if (!jid) return Response.json({ error: 'jid required' }, { status: 400 });
    const custom = (name ?? '').trim() || null;
    const db = getDb();
    if (custom) {
      await db`
        INSERT INTO app_contacts (jid, custom_name, updated_at)
        VALUES (${jid}, ${custom}, now())
        ON CONFLICT (jid) DO UPDATE SET custom_name = ${custom}, updated_at = now()
      `;
    } else {
      // Kosongkan = kembali ke nama dari WA (push_name)
      await db`UPDATE app_contacts SET custom_name = null, updated_at = now() WHERE jid = ${jid}`;
    }
    return { success: true, data: { jid, custom_name: custom } };
  });
