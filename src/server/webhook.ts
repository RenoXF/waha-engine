import { Elysia } from 'elysia';
import { verifyWebhook, handleWebhook } from '@/waha/webhook-handler';

export const webhookRoutes = new Elysia()
  .post('/webhook', async ({ request }) => {
    const signature = request.headers.get('x-webhook-hmac') || request.headers.get('x-waha-signature') || '';
    const body = await request.text();

    if (!verifyWebhook(body, signature)) {
      return new Response('Unauthorized', { status: 401 });
    }

    // WAHA sends event inside the JSON body
    let payload: Record<string, unknown>;
    let event = request.headers.get('x-waha-event') || '';
    try {
      payload = JSON.parse(body);
      if (!event && payload.event) event = String(payload.event);
    } catch {
      return new Response('Bad Request', { status: 400 });
    }

    // Fire and forget — don't block WAHA
    handleWebhook(event, payload).catch(() => {});

    return { ok: true };
  });
