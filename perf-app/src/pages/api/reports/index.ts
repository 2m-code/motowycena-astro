/**
 * GET /api/reports
 * Lista wszystkich zapisanych raportów (dla strony /reports/).
 */
import type { APIRoute } from 'astro';
import { listReports } from '@lib/perf/storage';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit') ?? 50)));
  const items = await listReports(limit);
  return new Response(JSON.stringify({ items }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
