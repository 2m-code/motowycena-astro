import type { APIRoute } from 'astro';
import { listProfiles } from '@lib/perf/profiles';

export const prerender = false;

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({ profiles: listProfiles() }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
