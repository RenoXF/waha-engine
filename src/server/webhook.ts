import { Elysia } from 'elysia';
import { verifyWebhook, handleWebhook } from '@/waha/webhook-handler';

export const webhookRoutes = new Elysia()
  .post('/webhook', async ({ request }) => {
    const signature = request.headers.get('x-waha-signature') || '';
    const body = await request.text();

    if (!verifyWebhook(body, signature)) {
      return new Response('Unauthorized', { status: 401 });
    }

    const event = request.headers.get('x-waha-event') || 'unknown';
    const payload = JSON.parse(body);

    // Fire and forget — don't block WAHA
    handleWebhook(event, payload).catch(() => {});

    return { ok: true };
  });
