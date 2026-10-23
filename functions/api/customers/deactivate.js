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

    const { id } = body;
    if (!id) {
      return jsonResponse({ success: false, error: 'Missing customer id' }, 400, req);
    }

    const updateUrl = `${url}/rest/v1/users?id=eq.${encodeURIComponent(id)}`;

    const res = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        title: 'Deactivated Customer - Historical Bids Preserved',
        updated_at: new Date().toISOString()
      })
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
