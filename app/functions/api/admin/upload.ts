import { fail, json, requireSession, storeUpload, verifyCsrf, type PagesContext } from '../../_admin';

export const onRequestPost = async (ctx: PagesContext): Promise<Response> => {
  const session = await requireSession(ctx);
  if (session instanceof Response) return session;
  if (!(await verifyCsrf(ctx, session))) return fail('Nieprawidłowy token CSRF', 403);

  let form: FormData;
  try {
    form = await ctx.request.formData();
  } catch {
    return fail('Nieprawidłowy format danych', 400);
  }

  const file = form.get('file');
  if (!(file instanceof File)) return fail('Brak pliku', 400);

  try {
    return json({ ok: true, url: await storeUpload(ctx, file) });
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Nie udało się wysłać pliku', 500);
  }
};
