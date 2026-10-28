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

    const { id, ...updateFields } = body;
    if (!id) {
      return jsonResponse({ success: false, error: 'Missing customer id' }, 400, req);
    }

    // Email must be read-only during customer updates; strictly disallow modifying email
    delete updateFields.email;

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const updateUrl = isUUID 
      ? `${url}/rest/v1/users?id=eq.${encodeURIComponent(id)}`
      : `${url}/rest/v1/users`;

    const res = await fetch(updateUrl, {
      method: isUUID ? 'PATCH' : 'POST',
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
        Prefer: isUUID ? 'return=representation' : 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(isUUID ? updateFields : { id, ...updateFields })
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
