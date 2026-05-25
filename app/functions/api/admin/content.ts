import { json, readContent, requireSession, type PagesContext } from '../../_admin';

export const onRequestGet = async (ctx: PagesContext): Promise<Response> => {
  const session = await requireSession(ctx);
  if (session instanceof Response) return session;

  return json({ ok: true, content: await readContent(ctx) });
};
