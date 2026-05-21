/**
 * GET /api/audit/[id]/events
 * Server-Sent Events stream postępu audytu.
 *
 * Każdy event ma format:
 *   data: {"type":"run-sample","runIndex":1,...}
 *   \n\n
 *
 * Klient subskrybuje przez new EventSource('/api/audit/abc/events').
 */
import type { APIRoute } from 'astro';
import { getJob, getEmitter } from '@lib/perf/jobs';
import type { JobProgress } from '@lib/perf/types';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const id = params.id;
  if (!id) {
    return new Response('Missing id', { status: 400 });
  }

  const job = getJob(id);
  const emitter = getEmitter(id);
  if (!job || !emitter) {
    return new Response('Job not found', { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        try {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          /* stream closed */
        }
      };

      // 1. Wyślij historię (replay) dla nowych subskrybentów
      for (const p of job.progress) {
        sendEvent('progress', p);
      }

      // 2. Jeśli już skończony - od razu wyślij końcowy event
      if (job.status === 'done') {
        sendEvent('finished', { reportId: job.reportId });
        controller.close();
        return;
      }
      if (job.status === 'failed') {
        sendEvent('failed', { error: job.error });
        controller.close();
        return;
      }

      // 3. Live subscription
      const onProgress = (p: JobProgress) => sendEvent('progress', p);
      const onFinished = (reportId: string) => {
        sendEvent('finished', { reportId });
        controller.close();
        cleanup();
      };
      const onFailed = (error: string) => {
        sendEvent('failed', { error });
        controller.close();
        cleanup();
      };

      const cleanup = () => {
        emitter.off('progress', onProgress);
        emitter.off('finished', onFinished);
        emitter.off('failed', onFailed);
        clearInterval(keepAlive);
      };

      emitter.on('progress', onProgress);
      emitter.once('finished', onFinished);
      emitter.once('failed', onFailed);

      // Keep-alive co 15s żeby proxy nie zamknęło połączenia
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keep-alive\n\n'));
        } catch {
          cleanup();
        }
      }, 15000);
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // nginx
    },
  });
};
