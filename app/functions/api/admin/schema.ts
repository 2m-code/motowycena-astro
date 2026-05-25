import { json, readSchema, type PagesContext } from '../../_admin';

export const onRequestGet = async (ctx: PagesContext): Promise<Response> => {
  return json({ ok: true, schema: await readSchema(ctx) });
};
