import { Elysia } from 'elysia';
import { verifyToken } from '@/auth';
import { readToken } from '@/auth/session';
import { subscribeSse, getBufferedEvents } from '@/waha/sse-pubsub';

export const sseRoutes = new Elysia()
  .get('/sse/live', async ({ request, cookie: { waha_session } }) => {
    // Auth: cookie first, then ?token=
    const token = readToken(request, waha_session?.value);
    if (!token) {
      return new Response('Unauthorized', { status: 401 });
    }

    const user = await verifyToken(token);
    if (!user) {
      return new Response('Invalid token', { status: 401 });
    }

    // Check Last-Event-ID for replay
    const lastId = Number(request.headers.get('Last-Event-ID') || 0);

    let cleanup = () => {};
    const stream = new ReadableStream({
      start(controller) {
        let closed = false;
        const safeEnqueue = (chunk: string) => {
          if (closed) return;
          try {
            controller.enqueue(chunk);
          } catch {
            cleanup();
          }
        };

        const unsubscribe = subscribeSse((event) => {
          safeEnqueue(
            `id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`
          );
        });

        const keepalive = setInterval(() => {
          safeEnqueue(': keepalive\n\n');
        }, 25_000);

        cleanup = () => {
          if (closed) return;
          closed = true;
          clearInterval(keepalive);
          unsubscribe();
        };

        // Replay buffered events
        if (lastId > 0) {
          for (const event of getBufferedEvents(lastId)) {
            safeEnqueue(
              `id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`
            );
          }
        }

        // Komentar langsung supaya browser/proxy tahu stream hidup tanpa
        // menunggu event pertama.
        safeEnqueue(': connected\n\n');
      },
      // Dipanggil saat client disconnect. Tanpa ini interval keepalive tidak
      // pernah berhenti — tiap reconnect menambah subscriber yatim sampai RAM
      // habis dan proses direstart, yang mematikan semua stream sekaligus.
      cancel() {
        cleanup();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  });
