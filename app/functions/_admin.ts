export interface AdminEnv {
  ADMIN_PASSWORD_SALT?: string;
  ADMIN_PASSWORD_SHA256?: string;
  ADMIN_SESSION_SECRET?: string;
  ADMIN_CONTENT?: {
    get(key: string, type: 'json'): Promise<unknown | null>;
    put(key: string, value: string): Promise<void>;
  };
  ADMIN_UPLOADS?: {
    put(
      key: string,
      value: ArrayBuffer,
      options?: { httpMetadata?: { contentType?: string } }
    ): Promise<unknown>;
  };
  ADMIN_UPLOADS_PUBLIC_URL?: string;
  ASSETS?: {
    fetch(input: Request | string): Promise<Response>;
  };
}

export interface PagesContext {
  request: Request;
  env: AdminEnv;
}

export interface AdminContent {
  updatedAt: string | null;
  fields: Record<string, { type: string; value: string }>;
}

export interface AdminSession {
  sid: string;
  exp: number;
}

const DEFAULT_PASSWORD_SALT = 'motowycena-admin-v1';
const DEFAULT_PASSWORD_SHA256 = '6167f3870104cf51e763dd50220a6dd072a529983cfdd11c0f32564d6c2e4520';
const SESSION_COOKIE = 'motowycena_admin';
const CONTENT_KEY = 'content';
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function json(data: unknown, status = 200, extraHeaders: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...extraHeaders,
    },
  });
}

export function fail(message: string, status = 400): Response {
  return json({ ok: false, error: message }, status);
}

export function isSetupReady(ctx: PagesContext): boolean {
  return Boolean(getSessionSecret(ctx, false));
}

export async function verifyPassword(password: string, env: AdminEnv): Promise<boolean> {
  const salt = env.ADMIN_PASSWORD_SALT ?? DEFAULT_PASSWORD_SALT;
  const expected = env.ADMIN_PASSWORD_SHA256 ?? DEFAULT_PASSWORD_SHA256;
  const actual = await sha256Hex(`${salt}:${password}`);
  return timingSafeEqual(actual, expected);
}

export async function createSessionResponse(ctx: PagesContext): Promise<Response> {
  const secret = getSessionSecret(ctx, true);
  const session: AdminSession = {
    sid: randomHex(32),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12,
  };
  const payload = base64UrlEncode(JSON.stringify(session));
  const signature = await hmacBase64Url(secret, payload);
  const csrf = await csrfToken(secret, session);
  const secure = new URL(ctx.request.url).protocol === 'https:' ? '; Secure' : '';

  return json(
    { ok: true, csrf },
    200,
    {
      'Set-Cookie': `${SESSION_COOKIE}=${payload}.${signature}; Path=/; HttpOnly; SameSite=Strict; Max-Age=43200${secure}`,
    }
  );
}

export function clearSessionResponse(): Response {
  return json(
    { ok: true },
    200,
    {
      'Set-Cookie': `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`,
    }
  );
}

export async function getSession(ctx: PagesContext): Promise<AdminSession | null> {
  const secret = getSessionSecret(ctx, false);
  if (!secret) return null;

  const cookie = parseCookies(ctx.request.headers.get('cookie') ?? '')[SESSION_COOKIE];
  if (!cookie) return null;

  const [payload, signature] = cookie.split('.');
  if (!payload || !signature) return null;

  const expected = await hmacBase64Url(secret, payload);
  if (!timingSafeEqual(signature, expected)) return null;

  try {
    const decoded = JSON.parse(base64UrlDecode(payload)) as AdminSession;
    if (!decoded.sid || !decoded.exp || decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export async function requireSession(ctx: PagesContext): Promise<AdminSession | Response> {
  const session = await getSession(ctx);
  if (!session) return fail('Brak autoryzacji', 401);
  return session;
}

export async function csrfToken(secret: string, session: AdminSession): Promise<string> {
  return hmacBase64Url(secret, `${session.sid}:${session.exp}:csrf`);
}

export async function csrfTokenForSession(ctx: PagesContext, session: AdminSession): Promise<string | null> {
  const secret = getSessionSecret(ctx, false);
  return secret ? csrfToken(secret, session) : null;
}

export async function verifyCsrf(ctx: PagesContext, session: AdminSession): Promise<boolean> {
  const secret = getSessionSecret(ctx, false);
  const token = ctx.request.headers.get('x-csrf-token') ?? '';
  if (!secret || !token) return false;
  return timingSafeEqual(token, await csrfToken(secret, session));
}

export async function readContent(ctx: PagesContext): Promise<AdminContent> {
  const fallback = await readAssetJson<AdminContent>(ctx, '/admin/data/content.json', {
    updatedAt: null,
    fields: {},
  });

  if (!ctx.env.ADMIN_CONTENT) return fallback;

  const stored = await ctx.env.ADMIN_CONTENT.get(CONTENT_KEY, 'json');
  return isAdminContent(stored) ? stored : fallback;
}

export async function writeContent(ctx: PagesContext, content: AdminContent): Promise<void> {
  if (!ctx.env.ADMIN_CONTENT) {
    throw new Error('Brak konfiguracji ADMIN_CONTENT KV');
  }
  await ctx.env.ADMIN_CONTENT.put(CONTENT_KEY, JSON.stringify(content, null, 2));
}

export async function readSchema(ctx: PagesContext): Promise<unknown> {
  return readAssetJson(ctx, '/admin/schema.json', { groups: [] });
}

export function cleanContentPayload(raw: unknown): AdminContent | null {
  if (!raw || typeof raw !== 'object' || !('fields' in raw)) return null;
  const fieldsInput = (raw as { fields?: unknown }).fields;
  if (!fieldsInput || typeof fieldsInput !== 'object') return null;

  const fields: AdminContent['fields'] = {};
  for (const [key, field] of Object.entries(fieldsInput as Record<string, unknown>)) {
    if (!/^[a-zA-Z0-9._-]{2,120}$/.test(key)) continue;
    if (!field || typeof field !== 'object') continue;

    const source = field as { type?: unknown; value?: unknown };
    const allowedTypes = ['text', 'textarea', 'html', 'image'];
    const type = allowedTypes.includes(String(source.type)) ? String(source.type) : 'text';
    const value = String(source.value ?? '');
    fields[key] = { type, value };
  }

  return {
    updatedAt: new Date().toISOString(),
    fields,
  };
}

export async function storeUpload(ctx: PagesContext, file: File): Promise<string> {
  if (!ctx.env.ADMIN_UPLOADS) {
    throw new Error('Brak konfiguracji ADMIN_UPLOADS R2. Możesz wkleić URL pliku ręcznie.');
  }
  if (file.size <= 0) throw new Error('Brak pliku');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('Plik jest za duży');

  const allowed: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'application/pdf': 'pdf',
    'video/mp4': 'mp4',
  };
  const extension = allowed[file.type];
  if (!extension) throw new Error('Dozwolone są JPG, PNG, WEBP, GIF, PDF i MP4');

  const date = new Date();
  const subdir = `${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  const basename = slugify(file.name.replace(/\.[^.]+$/, '')) || 'plik';
  const key = `admin/uploads/${subdir}/${basename}-${randomHex(5)}.${extension}`;

  await ctx.env.ADMIN_UPLOADS.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });

  const publicBase = (ctx.env.ADMIN_UPLOADS_PUBLIC_URL ?? '').replace(/\/$/, '');
  return publicBase ? `${publicBase}/${key}` : `/${key}`;
}

async function readAssetJson<T>(ctx: PagesContext, path: string, fallback: T): Promise<T> {
  try {
    const url = new URL(path, ctx.request.url).toString();
    const response = ctx.env.ASSETS
      ? await ctx.env.ASSETS.fetch(new Request(url))
      : await fetch(url);
    if (!response.ok) return fallback;
    const data = await response.json();
    return data as T;
  } catch {
    return fallback;
  }
}

function isAdminContent(value: unknown): value is AdminContent {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'fields' in value &&
      typeof (value as { fields?: unknown }).fields === 'object'
  );
}

function getSessionSecret(ctx: PagesContext, throwOnMissing: true): string;
function getSessionSecret(ctx: PagesContext, throwOnMissing: false): string | null;
function getSessionSecret(ctx: PagesContext, throwOnMissing: boolean): string | null {
  const value = ctx.env.ADMIN_SESSION_SECRET;
  if (value && value.length >= 32) return value;

  const hostname = new URL(ctx.request.url).hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${ctx.env.ADMIN_PASSWORD_SHA256 ?? DEFAULT_PASSWORD_SHA256}:local-session-secret`;
  }

  if (throwOnMissing) {
    throw new Error('Brak ADMIN_SESSION_SECRET w zmiennych Cloudflare Pages');
  }
  return null;
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hmacBase64Url(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

function parseCookies(header: string): Record<string, string> {
  return Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf('=');
        if (index === -1) return [part, ''];
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

function base64UrlEncode(value: string): string {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function base64UrlDecode(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return atob(padded);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}
