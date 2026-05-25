import { json, readContent, type PagesContext } from '../../_admin';

export const onRequestGet = async (ctx: PagesContext): Promise<Response> => {
  return json(await readContent(ctx));
};
