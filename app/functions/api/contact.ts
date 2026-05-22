/**
 * Cloudflare Pages Function: POST /api/contact
 * Pozostaje POZA Astro buildem - dzięki temu strona jest 100% statyczna,
 * a endpoint to lekki worker (cold start <5ms).
 *
 * Progressive Enhancement:
 *   - JS aktywny: fetch z Content-Type: application/json → JSON odpowiedź.
 *   - JS wyłączony: zwykły form POST → 303 redirect na /kontakt/?sent=1.
 *
 * Walidacja: ręczna (brak zależności do zod żeby worker był jak najmniejszy).
 * Anti-spam: honeypot + Cloudflare Turnstile (jeśli skonfigurowane).
 * Wysyłka: Resend API (wymagane env.RESEND_API_KEY na produkcji).
 *
 * Env vars w Cloudflare Pages > Settings > Environment variables:
 *   - RESEND_API_KEY (sekret)
 *   - CONTACT_EMAIL (jawny)
 *   - MAIL_FROM (jawny)
 *   - TURNSTILE_SECRET_KEY (sekret, opcjonalny)
 */

export interface Env {
  RESEND_API_KEY?: string;
  CONTACT_EMAIL?: string;
  MAIL_FROM?: string;
  TURNSTILE_SECRET_KEY?: string;
}

interface ContactPayload {
  name: string;
  email: string;
  phone: string;
  message: string;
  consent: boolean | 'on' | 'true';
  website?: string;
  'cf-turnstile-response'?: string;
}

interface PagesContext {
  request: Request;
  env: Env;
  // CF Pages dorzuca ip w request.headers.get('cf-connecting-ip') lub request.cf.
}

export const onRequestPost = async (ctx: PagesContext): Promise<Response> => {
  const { request, env } = ctx;
  const contentType = request.headers.get('content-type') ?? '';
  const wantsJSON =
    contentType.includes('application/json') ||
    (request.headers.get('accept') ?? '').includes('application/json');

  let raw: Record<string, unknown>;
  try {
    if (contentType.includes('application/json')) {
      raw = (await request.json()) as Record<string, unknown>;
    } else {
      const form = await request.formData();
      raw = Object.fromEntries(form.entries());
    }
  } catch {
    return fail(wantsJSON, 'Invalid request body', 400);
  }

  // Walidacja ręczna (bez zod żeby zminimalizować bundle workera)
  const validation = validate(raw);
  if (!validation.ok) {
    return fail(wantsJSON, validation.error, 400);
  }
  const data = validation.data;

  // Honeypot – bot wypełnił ukryte pole. Udajemy sukces (nie informujemy bota).
  if (data.website && data.website.length > 0) {
    return success(wantsJSON);
  }

  // Cloudflare Turnstile – jeśli secret jest ustawiony, token jest wymagany.
  if (env.TURNSTILE_SECRET_KEY) {
    if (!data['cf-turnstile-response']) {
      return fail(wantsJSON, 'Verification missing – odśwież stronę i spróbuj ponownie', 400);
    }
    const ip = request.headers.get('cf-connecting-ip') ?? undefined;
    const ok = await verifyTurnstile(
      data['cf-turnstile-response'],
      env.TURNSTILE_SECRET_KEY,
      ip
    );
    if (!ok) {
      return fail(wantsJSON, 'Verification failed – spróbuj ponownie', 400);
    }
  }

  // Wysyłka maila
  try {
    const ip = request.headers.get('cf-connecting-ip') ?? undefined;
    await sendEmail(data, env, ip);
  } catch (err) {
    console.error('[contact-form] send failed', err);
    return fail(wantsJSON, 'Internal error', 500);
  }

  return success(wantsJSON);
};

// Cloudflare Pages Functions: każdy plik to handler. OPTIONS dla CORS gdy ktoś
// odpytuje z innej domeny (np. preview).
export const onRequestOptions = async (): Promise<Response> => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://www.motowycena.pl',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
      'Access-Control-Max-Age': '86400',
    },
  });
};

// ===== HELPERS =====

function validate(
  raw: Record<string, unknown>
): { ok: true; data: ContactPayload } | { ok: false; error: string } {
  const name = String(raw.name ?? '').trim();
  const email = String(raw.email ?? '').trim().toLowerCase();
  const phone = String(raw.phone ?? '').trim();
  const message = String(raw.message ?? '').trim();
  const consent = raw.consent;
  const website = String(raw.website ?? '');
  const turnstile = raw['cf-turnstile-response'];

  if (name.length < 2 || name.length > 100) return { ok: false, error: 'Imię i nazwisko nieprawidłowe' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Email nieprawidłowy' };
  if (phone.length < 9 || phone.length > 20) return { ok: false, error: 'Telefon nieprawidłowy' };
  if (message.length < 10 || message.length > 2000) return { ok: false, error: 'Wiadomość zbyt krótka lub zbyt długa' };
  if (consent !== true && consent !== 'on' && consent !== 'true') {
    return { ok: false, error: 'Wymagana zgoda na przetwarzanie danych' };
  }

  return {
    ok: true,
    data: {
      name,
      email,
      phone,
      message,
      consent: consent as ContactPayload['consent'],
      website,
      'cf-turnstile-response': typeof turnstile === 'string' ? turnstile : undefined,
    },
  };
}

function success(wantsJSON: boolean): Response {
  if (wantsJSON) {
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://www.motowycena.pl',
      },
    });
  }
  return new Response(null, {
    status: 303,
    headers: { Location: '/kontakt/?sent=1' },
  });
}

function fail(wantsJSON: boolean, message: string, status: number): Response {
  if (wantsJSON) {
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://www.motowycena.pl',
      },
    });
  }
  return new Response(null, {
    status: 303,
    headers: { Location: '/kontakt/?error=1' },
  });
}

async function verifyTurnstile(
  token: string,
  secret: string,
  ip?: string
): Promise<boolean> {
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret,
        response: token,
        ...(ip ? { remoteip: ip } : {}),
      }),
    });
    const json = (await res.json()) as { success: boolean };
    return json.success === true;
  } catch {
    return false;
  }
}

async function sendEmail(data: ContactPayload, env: Env, ip?: string): Promise<void> {
  const RESEND_API_KEY = env.RESEND_API_KEY;
  const CONTACT_EMAIL = env.CONTACT_EMAIL ?? 'biuro@motowycena.pl';
  const FROM = env.MAIL_FROM ?? 'Formularz <noreply@motowycena.pl>';

  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const subject = `Nowe zapytanie ze strony – ${data.name}`;
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 600px;">
      <h2 style="color: #1e3a8a;">Nowe zapytanie z motowycena.pl</h2>
      <table style="border-collapse: collapse; width: 100%;">
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Od:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(data.name)}</td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Email:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;"><a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a></td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Telefon:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;"><a href="tel:${escapeHtml(data.phone)}">${escapeHtml(data.phone)}</a></td></tr>
        <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>IP:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(ip ?? '–')}</td></tr>
      </table>
      <h3 style="color: #1e3a8a;">Wiadomość:</h3>
      <div style="padding: 12px; background: #f9fafb; border-left: 3px solid #1e3a8a;">
        ${escapeHtml(data.message).replace(/\n/g, '<br>')}
      </div>
      <p style="font-size: 12px; color: #999; margin-top: 24px;">
        Wiadomość wygenerowana automatycznie z formularza kontaktowego.
      </p>
    </div>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [CONTACT_EMAIL],
      reply_to: data.email,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Resend API error ${res.status}: ${errText}`);
  }
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
