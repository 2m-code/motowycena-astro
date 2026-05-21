/**
 * GET /api/audit/[id]
 * Zwraca stan joba (status + cała historia progress).
 */
import type { APIRoute } from 'astro';
import { getJob } from '@lib/perf/jobs';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const id = params.id;
  if (!id) return new Response('Missing id', { status: 400 });

  const job = getJob(id);
  if (!job) return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });

  return new Response(JSON.stringify(job, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
