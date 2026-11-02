import { jsonResponse, handleOptions, getSupabaseCredentials } from '../_utils.js';

export async function onRequestOptions(context) {
  return handleOptions(context.request);
}

export async function onRequestGet(context) {
  const req = context.request;
  const env = context.env || {};
  const { url, secretKey } = getSupabaseCredentials(env);

  try {
    const fetchUrl = `${url}/rest/v1/email-list?select=*&order=created_at.desc`;
    const res = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
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

