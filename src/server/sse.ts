import { Elysia } from 'elysia';
import { verifyToken } from '@/auth';
import { subscribeSse, getBufferedEvents } from '@/waha/sse-pubsub';

export const sseRoutes = new Elysia()
  .get('/sse/live', async ({ request, cookie: { waha_session } }) => {
    // Auth: cookie first, then ?token=
    const token = waha_session.value || new URL(request.url).searchParams.get('token');
    if (!token) {
      return new Response('Unauthorized', { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return new Response('Invalid token', { status: 401 });
    }

    // Check Last-Event-ID for replay
    const lastId = Number(request.headers.get('Last-Event-ID') || 0);

    const stream = new ReadableStream({
      start(controller) {
        // Replay buffered events
        if (lastId > 0) {
          const missed = getBufferedEvents(lastId);
          for (const event of missed) {
            controller.enqueue(`id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
          }
        }

        // Subscribe to new events
        const unsubscribe = subscribeSse((event) => {
          try {
            controller.enqueue(`id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
          } catch {
            unsubscribe();
          }
        });

        // Keepalive every 30s
        const keepalive = setInterval(() => {
          try {
            controller.enqueue(': keepalive\n\n');
          } catch {
            clearInterval(keepalive);
            unsubscribe();
          }
        }, 30_000);

        // Cleanup on close
        const originalCancel = controller.close.bind(controller);
        controller.close = () => {
          clearInterval(keepalive);
          unsubscribe();
          originalCancel();
        };
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  });
