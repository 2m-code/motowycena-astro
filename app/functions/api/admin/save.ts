import {
  cleanContentPayload,
  fail,
  json,
  requireSession,
  verifyCsrf,
  writeContent,
  type PagesContext,
} from '../../_admin';

export const onRequestPost = async (ctx: PagesContext): Promise<Response> => {
  const session = await requireSession(ctx);
  if (session instanceof Response) return session;
  if (!(await verifyCsrf(ctx, session))) return fail('Nieprawidłowy token CSRF', 403);

  let payload: unknown;
  try {
    payload = await ctx.request.json();
  } catch {
    return fail('Nieprawidłowy format danych', 400);
  }

  const content = cleanContentPayload(payload);
  if (!content) return fail('Nieprawidłowy format danych', 400);

  try {
    await writeContent(ctx, content);
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Nie udało się zapisać danych', 500);
  }

  return json({ ok: true, content });
};
