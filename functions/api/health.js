import { jsonResponse, handleOptions, getSupabaseCredentials } from './_utils.js';

export async function onRequestOptions(context) {
  return handleOptions(context.request);
}

export async function onRequestGet(context) {
  const req = context.request;
  const env = context.env || {};
  const { url, secretKey } = getSupabaseCredentials(env);

  const start = Date.now();
  let dbStatus;

  try {
    const res = await fetch(`${url}/rest/v1/`, {
      method: 'GET',
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
      },
    });
    dbStatus = res.ok ? 'connected' : `http_${res.status}`;
  } catch (e) {
    dbStatus = `unreachable: ${e.message}`;
  }

  return jsonResponse(
    {
      status: 'healthy',
      edgeRuntime: 'Cloudflare / Supabase Edge',
      projectUrl: url,
      database: dbStatus,
      latencyMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    },
    200,
    req
  );
}
