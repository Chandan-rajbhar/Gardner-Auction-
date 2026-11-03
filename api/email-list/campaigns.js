const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://rzacpssumjahxndmqnxm.supabase.co';
const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  Buffer.from('c2Jfc2VjcmV0X3RyLXFKbFpHektPaUZZaUlIR1RGX1FfcGZjVWcwclg=', 'base64').toString('utf-8');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const fetchUrl = `${SUPABASE_URL}/rest/v1/activity_logs?category=eq.EMAIL_CAMPAIGN&select=*&order=timestamp.desc`;
    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_SECRET_KEY,
        Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ success: false, error: errText });
    }

    const data = await response.json();
    const mapped = (data || []).map((log) => {
      const meta = log.metadata || {};
      return {
        id: log.id,
        name: meta.campaignName || log.event_action || 'Auction Announcement',
        subject: meta.subject || log.audit_details || 'Catalog Release',
        message: meta.messagePreview || '',
        auction_id: meta.auctionId || null,
        auction_title: meta.auctionTitle || null,
        catalog_url: meta.catalogUrl || null,
        recipient_count: meta.totalRecipients || 0,
        successful_sends: meta.successfulSends || (log.status === 'SUCCESS' ? meta.totalRecipients || 1 : 0),
        failed_sends: meta.failedSends || (log.status === 'FAILED' ? meta.totalRecipients || 1 : 0),
        status: log.status === 'SUCCESS' ? 'sent' : log.status === 'FAILED' ? 'failed' : 'partial',
        sent_at: log.timestamp || log.created_at || new Date().toISOString(),
        recipients: meta.recipients || [],
        failure_details: meta.failureDetails || []
      };
    });

    return res.status(200).json({ success: true, data: mapped });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

