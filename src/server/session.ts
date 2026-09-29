import { Elysia } from 'elysia';
import { getDb } from '@/db/client';
import * as waha from '@/waha/client';
import { config } from '@/config';
import { ssePush } from '@/waha/sse-pubsub';

export const sessionRoutes = new Elysia({ prefix: '/session' })
  // GET /session — status
  .get('/', async () => {
    try {
      const session = await waha.getSession();
      return { success: true, data: session };
    } catch {
      return { success: true, data: { state: 'STOPPED' } };
    }
  })

  // GET /session/qr — get QR code
  .get('/qr', async () => {
    try {
      const qr = await waha.getQR();
      return { success: true, data: qr };
    } catch (err) {
      return Response.json({ error: String(err) }, { status: 500 });
    }
  })

  // POST /session/start — start session
  .post('/start', async ({ request }) => {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    try {
      const result = await waha.startSession(config.wahaSessionName, body);
      ssePush('device_state', { state: 'STARTING' });
      return { success: true, data: result };
    } catch (err) {
      return Response.json({ error: String(err) }, { status: 500 });
    }
  })

  // POST /session/stop
  .post('/stop', async () => {
    try {
      await waha.stopSession();
      ssePush('device_state', { state: 'STOPPED' });
      return { success: true };
    } catch (err) {
      return Response.json({ error: String(err) }, { status: 500 });
    }
  })

  // POST /session/logout
  .post('/logout', async () => {
    try {
      await waha.logoutSession();
      ssePush('device_state', { state: 'LOGGED_OUT' });
      return { success: true };
    } catch (err) {
      return Response.json({ error: String(err) }, { status: 500 });
    }
  })

  // POST /session/pairing-code — request pairing code
  .post('/pairing-code', async ({ request }) => {
    const body = await request.json();
    const { phoneNumber } = body as { phoneNumber: string };
    if (!phoneNumber) {
      return Response.json({ error: 'phoneNumber required' }, { status: 400 });
    }
    try {
      const result = await waha.requestPairingCode(config.wahaSessionName, phoneNumber);
      return { success: true, data: result };
    } catch (err) {
      return Response.json({ error: String(err) }, { status: 500 });
    }
  });
