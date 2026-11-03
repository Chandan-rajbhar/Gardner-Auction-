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
    const { id, ids, email } = body;
    let deleteUrl;

    if (Array.isArray(ids) && ids.length > 0) {
      deleteUrl = `${SUPABASE_URL}/rest/v1/email-list?id=in.(${ids.map(encodeURIComponent).join(',')})`;
    } else if (id) {
      deleteUrl = `${SUPABASE_URL}/rest/v1/email-list?id=eq.${encodeURIComponent(id)}`;
    } else if (email) {
      deleteUrl = `${SUPABASE_URL}/rest/v1/email-list?email=eq.${encodeURIComponent(email.toLowerCase())}`;
    } else {
      return res.status(400).json({ success: false, error: 'Missing subscriber id or ids' });
    }

    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        apikey: SUPABASE_SECRET_KEY,
        Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ success: false, error: errText });
    }

    const data = await response.json().catch(() => []);
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

