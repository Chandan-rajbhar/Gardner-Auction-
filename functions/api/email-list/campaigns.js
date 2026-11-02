import { jsonResponse, handleOptions, getSupabaseCredentials } from '../_utils.js';

export async function onRequestOptions(context) {
  return handleOptions(context.request);
}

export async function onRequestGet(context) {
  const req = context.request;
  const env = context.env || {};
  const { url, secretKey } = getSupabaseCredentials(env);

  try {
    const fetchUrl = `${url}/rest/v1/activity_logs?category=eq.EMAIL_CAMPAIGN&order=timestamp.desc`;
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

    const logs = await res.json().catch(() => []);
    const campaigns = logs.map((log) => {
      const meta = log.metadata || {};
      return {
        id: log.id,
        name: meta.name || meta.campaignName || log.event_action || 'Auction Announcement',
        subject: meta.subject || log.audit_details || 'Catalog Release',
        message: meta.message || meta.messagePreview || '',
        auction_id: meta.auction_id || meta.auctionId || null,
        auction_title: meta.auction_title || meta.auctionTitle || null,
        catalog_url: meta.catalog_url || meta.catalogUrl || null,
        recipient_count: meta.recipient_count || meta.totalRecipients || 0,
        successful_sends: meta.successful_sends ?? (log.status === 'SUCCESS' ? meta.recipient_count || 1 : 0),
        failed_sends: meta.failed_sends ?? (log.status === 'FAILED' ? meta.recipient_count || 1 : 0),
        status: meta.status || (log.status === 'SUCCESS' ? 'sent' : log.status === 'FAILED' ? 'failed' : 'partial'),
        sent_at: log.timestamp || log.created_at || new Date().toISOString(),
        recipients: meta.recipients || [],
        failure_details: meta.failure_details || meta.failureDetails || []
      };
    });

    return jsonResponse({ success: true, data: campaigns }, 200, req);
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500, req);
  }
}

