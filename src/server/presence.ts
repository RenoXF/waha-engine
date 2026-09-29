import { Elysia } from 'elysia';
import * as waha from '@/waha/client';
import { config } from '@/config';

export const presenceRoutes = new Elysia({ prefix: '/presence' })
  .post('/typing', async ({ request }) => {
    const body = await request.json();
    const { jid, typing } = body as { jid: string; typing: boolean };

    if (!jid) {
      return Response.json({ error: 'jid required' }, { status: 400 });
    }

    const session = config.wahaSessionName;
    const presence = typing ? 'composing' : 'paused';
    await waha.setPresence(session, presence, jid).catch(() => {});

    return { success: true };
  });
