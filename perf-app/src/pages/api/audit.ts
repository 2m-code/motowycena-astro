/**
 * POST /api/audit
 * Tworzy nowy audit job i odpala go w tle.
 * Zwraca natychmiast { jobId }.
 *
 * Klient potem subskrybuje /api/audit/[id]/events (SSE) i pobiera
 * /api/audit/[id] po zakończeniu.
 */
import type { APIRoute } from 'astro';
import { createJob } from '@lib/perf/jobs';
import { runAudit } from '@lib/perf/audit';
import { getProfile } from '@lib/perf/profiles';

export const prerender = false;

interface RequestBody {
  url?: string;
  profileId?: string;
  runs?: number;
}

export const POST: APIRoute = async ({ request }) => {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const rawUrl = (body.url ?? '').trim();
  if (!rawUrl) {
    return new Response(JSON.stringify({ error: 'url wymagane' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  let url: string;
  try {
    const u = new URL(rawUrl);
    if (!['http:', 'https:'].includes(u.protocol)) {
      throw new Error('Tylko http/https');
    }
    url = u.toString();
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: `Niepoprawny URL: ${err?.message ?? err}` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const profileId = body.profileId ?? 'mobile-slow4g';
  try {
    getProfile(profileId);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const runs = Math.max(1, Math.min(15, Math.floor(body.runs ?? 3)));

  const job = createJob({ url, profileId, runs });

  // Odpalamy w tle - NIE czekamy
  void runAudit({ url, profileId, runs, jobId: job.id }).catch((err) => {
    // już zalogowane przez runAudit -> failJob, nic więcej nie trzeba
    console.error('[audit] background error', err);
  });

  return new Response(
    JSON.stringify({ jobId: job.id, status: job.status }),
    { status: 202, headers: { 'Content-Type': 'application/json' } },
  );
};
