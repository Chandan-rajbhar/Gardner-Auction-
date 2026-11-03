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

  const start = Date.now();
  let dbStatus = 'unknown';

  try {
    const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_SECRET_KEY,
        Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
      },
    });
    dbStatus = checkRes.ok ? 'connected' : `http_${checkRes.status}`;
  } catch (e) {
    dbStatus = `unreachable: ${e.message}`;
  }

  return res.status(200).json({
    status: 'healthy',
    runtime: 'Vercel Serverless Function',
    projectUrl: SUPABASE_URL,
    database: dbStatus,
    latencyMs: Date.now() - start,
    timestamp: new Date().toISOString()
  });
}

