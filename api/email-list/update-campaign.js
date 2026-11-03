const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://rzacpssumjahxndmqnxm.supabase.co';
const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  Buffer.from('c2Jfc2VjcmV0X3RyLXFKbFpHektPaUZZaUlIR1RGX1FfcGZjVWcwclg=', 'base64').toString('utf-8');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { id, name, subject, message, auctionId, auctionTitle, catalogUrl } = body;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Campaign id is required' });
    }

    const getRes = await fetch(`${SUPABASE_URL}/rest/v1/activity_logs?id=eq.${encodeURIComponent(id)}&select=*`, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_SECRET_KEY,
        Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const rows = await getRes.json();
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    const existing = rows[0];
    const currentMeta = existing.metadata || {};
    const updatedMeta = {
      ...currentMeta,
      name: name ? name.trim() : currentMeta.name,
      subject: subject ? subject.trim() : currentMeta.subject,
      message: message !== undefined ? message.trim() : currentMeta.message,
      auction_id: auctionId !== undefined ? auctionId : currentMeta.auction_id,
      auction_title: auctionTitle !== undefined ? auctionTitle : currentMeta.auction_title,
      catalog_url: catalogUrl !== undefined ? catalogUrl : currentMeta.catalog_url
    };

    const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/activity_logs?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_SECRET_KEY,
        Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify({
        event_action: `Email Campaign: ${updatedMeta.name}`,
        audit_details: `Dispatched "${updatedMeta.subject}" to ${updatedMeta.recipient_count || 0} subscribers.`,
        metadata: updatedMeta
      })
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      return res.status(updateRes.status).json({ success: false, error: errText });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

