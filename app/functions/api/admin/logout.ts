import { clearSessionResponse } from '../../_admin';

export const onRequestPost = async (): Promise<Response> => clearSessionResponse();
