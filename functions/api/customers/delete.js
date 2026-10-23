import { jsonResponse, handleOptions, getSupabaseCredentials } from '../../_utils.js';

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

    const { id, email } = body;
    if (!id && !email) {
      return jsonResponse({ success: false, error: 'Missing customer id or email' }, 400, req);
    }

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const deleteUrl = isUUID 
      ? `${url}/rest/v1/users?id=eq.${encodeURIComponent(id)}`
      : `${url}/rest/v1/users?email=eq.${encodeURIComponent(email.toLowerCase())}`;

    const res = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      return jsonResponse({ success: false, error: errText }, res.status, req);
    }

    const data = await res.json().catch(() => []);
    return jsonResponse({ success: true, data }, 200, req);
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500, req);
  }
}
