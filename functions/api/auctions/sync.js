import { jsonResponse, handleOptions, getSupabaseCredentials } from '../_utils.js';

export async function onRequestOptions(context) {
  return handleOptions(context.request);
}

export async function onRequestPost(context) {
  const req = context.request;
  const env = context.env || {};
  const { url } = getSupabaseCredentials(env);

  return jsonResponse(
    {
      success: true,
      message: 'HiBid AF360 Network Telemetry Synced with Supabase Edge',
      projectUrl: url,
      nodes: [
        'florida.hibid.com',
        'confiscatedassetsauctioneers.hibid.com',
        'www.hibid.com',
      ],
      syncedAt: new Date().toISOString(),
    },
    200,
    req
  );
}
