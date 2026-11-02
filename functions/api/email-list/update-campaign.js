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

    const { id, name, subject, message, auctionId, auctionTitle, catalogUrl } = body;
    if (!id) {
      return jsonResponse({ success: false, error: 'Missing campaign id' }, 400, req);
    }

    // Fetch existing
    const fetchRes = await fetch(`${url}/rest/v1/activity_logs?id=eq.${encodeURIComponent(id)}&select=*`, {
      method: 'GET',
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      }
    });

    const existingList = await fetchRes.json().catch(() => []);
    const existing = existingList[0];
    if (!existing) {
      return jsonResponse({ success: false, error: 'Campaign record not found' }, 404, req);
    }

    const currentMeta = existing.metadata || {};
    const updatedMeta = {
      ...currentMeta,
      name: name ? String(name).trim() : currentMeta.name,
      subject: subject ? String(subject).trim() : currentMeta.subject,
      message: message !== undefined ? String(message).trim() : currentMeta.message,
      auction_id: auctionId !== undefined ? auctionId : currentMeta.auction_id,
      auction_title: auctionTitle !== undefined ? auctionTitle : currentMeta.auction_title,
      catalog_url: catalogUrl !== undefined ? catalogUrl : currentMeta.catalog_url
    };

    const updateRes = await fetch(`${url}/rest/v1/activity_logs?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify({
        event_action: `Email Campaign: ${updatedMeta.name}`,
        audit_details: `Dispatched "${updatedMeta.subject}" to ${updatedMeta.recipient_count || 0} subscribers.`,
        metadata: updatedMeta,
        updated_at: new Date().toISOString()
      })
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      return jsonResponse({ success: false, error: errText }, updateRes.status, req);
    }

    const data = await updateRes.json().catch(() => []);
    return jsonResponse({ success: true, data: data[0] }, 200, req);
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500, req);
  }
}

