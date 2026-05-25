import { csrfTokenForSession, getSession, isSetupReady, json, type PagesContext } from '../../_admin';

export const onRequestGet = async (ctx: PagesContext): Promise<Response> => {
  const session = await getSession(ctx);
  const secretReady = isSetupReady(ctx);

  return json({
    ok: true,
    loggedIn: Boolean(session),
    csrf: session && secretReady ? await csrfTokenForSession(ctx, session) : null,
    setupReady: secretReady,
  });
};
