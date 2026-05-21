/**
 * GET /api/reports/[host]/[id]
 * Zwraca pojedynczy zapisany raport.
 */
import type { APIRoute } from 'astro';
import { loadReport } from '@lib/perf/storage';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const host = params.host;
  const id = params.id;
  if (!host || !id) {
    return new Response('Missing host or id', { status: 400 });
  }
  const report = await loadReport(host, id);
  if (!report) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify(report), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
