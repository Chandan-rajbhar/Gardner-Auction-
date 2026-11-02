import { jsonResponse, handleOptions, getSupabaseCredentials } from '../_utils.js';

export async function onRequestOptions(context) {
  return handleOptions(context.request);
}

export async function onRequestPost(context) {
  const req = context.request;
  const env = context.env || {};
  const { url, secretKey } = getSupabaseCredentials(env);

  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ success: false, error: 'Invalid JSON request payload' }, 400, req);
    }

    const { id } = body;
    if (!id) {
      return jsonResponse({ success: false, error: 'Missing campaign id' }, 400, req);
    }

    const deleteRes = await fetch(`${url}/rest/v1/activity_logs?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!deleteRes.ok) {
      const errText = await deleteRes.text();
      return jsonResponse({ success: false, error: errText }, deleteRes.status, req);
    }

    return jsonResponse({ success: true }, 200, req);
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500, req);
  }
}

