import { Elysia } from 'elysia';
import { tokenIsValid } from '@/auth';
import { subscribeSse, getBufferedEvents, getLastEventId } from '@/waha/sse-pubsub';

export const sseRoutes = new Elysia()
  .get('/sse/live', async ({ request, cookie: { waha_session } }) => {
    // Same-origin (API menyajikan SPA), jadi cookie selalu ikut di EventSource.
    if (!tokenIsValid(waha_session?.value)) {
      return new Response('Unauthorized', { status: 401 });
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

        // Replay + subscribe tanpa duplikat: event yang masuk selama replay
        // ditampung dulu, replay hanya sampai snapshot id, sisanya menyusul.
        const boundary = getLastEventId();
        let replaying = true;
        const pending: string[] = [];
        const encode = (event: { id: number; type: string; data: unknown }) =>
          `id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;

        const unsubscribe = subscribeSse((event) => {
          if (replaying) {
            pending.push(encode(event));
            return;
          }
          safeEnqueue(encode(event));
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
            if (event.id > boundary) break;
            safeEnqueue(encode(event));
          }
        }
        replaying = false;
        for (const chunk of pending) safeEnqueue(chunk);

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
