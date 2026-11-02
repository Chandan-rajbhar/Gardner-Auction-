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

    const { id, ids, email } = body;
    let deleteUrl;

    if (Array.isArray(ids) && ids.length > 0) {
      deleteUrl = `${url}/rest/v1/email-list?id=in.(${ids.map(encodeURIComponent).join(',')})`;
    } else if (id) {
      deleteUrl = `${url}/rest/v1/email-list?id=eq.${encodeURIComponent(id)}`;
    } else if (email) {
      deleteUrl = `${url}/rest/v1/email-list?email=eq.${encodeURIComponent(email.toLowerCase())}`;
    } else {
      return jsonResponse({ success: false, error: 'Missing subscriber id or ids' }, 400, req);
    }

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
    return jsonResponse({ success: true, count: data.length, data }, 200, req);
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500, req);
  }
}

