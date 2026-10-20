import { Elysia } from 'elysia';
import { handleWebhook } from '@/waha/webhook-handler';
import { logger } from '@/logger';

// WAHA jalan di localhost dan webhook tidak keluar dari VM, jadi tidak ada
// HMAC. Jangan expose port 4000 ke publik tanpa reverse proxy ber-auth.
export const webhookRoutes = new Elysia()
  .post('/webhook', async ({ request }) => {
    let payload: Record<string, unknown>;
    let event = request.headers.get('x-waha-event') || '';
    try {
      payload = (await request.json()) as Record<string, unknown>;
      if (!event && payload.event) event = String(payload.event);
    } catch {
      return new Response('Bad Request', { status: 400 });
    }

    // Fire and forget — don't block WAHA.
    handleWebhook(event, payload).catch((err) =>
      logger.error(err, '[webhook] handler crashed')
    );

    return { ok: true };
  });
