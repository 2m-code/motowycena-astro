import { createSessionResponse, fail, verifyPassword, type PagesContext } from '../../_admin';

export const onRequestPost = async (ctx: PagesContext): Promise<Response> => {
  let payload: { password?: unknown };
  try {
    payload = (await ctx.request.json()) as { password?: unknown };
  } catch {
    return fail('Nieprawidłowy format danych', 400);
  }

  const password = String(payload.password ?? '');
  if (!(await verifyPassword(password, ctx.env))) {
    return fail('Nieprawidłowe hasło', 401);
  }

  try {
    return await createSessionResponse(ctx);
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Błąd konfiguracji panelu', 500);
  }
};
