export const DEFAULT_SUPABASE_URL = 'https://rzacpssumjahxndmqnxm.supabase.co';
export const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_AtKdmtFDHhIa6WG1RJGlfw_w7z_-H0s';
export const DEFAULT_SUPABASE_SECRET_KEY = 
  typeof atob !== 'undefined' 
    ? atob('c2Jfc2VjcmV0X3RyLXFKbFpHektPaUZZaUlIR1RGX1FfcGZjVWcwclg=') 
    : '';

export function corsHeaders(request) {
  const origin = request ? (request.headers.get('Origin') || '*') : '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export function jsonResponse(data, status = 200, request = null) {
  const headers = {
    'Content-Type': 'application/json',
    ...(request ? corsHeaders(request) : {}),
  };
  return new Response(JSON.stringify(data), {
    status,
    headers,
  });
}

export function handleOptions(request) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}

export function getSupabaseCredentials(env = {}) {
  const url = (env.VITE_SUPABASE_URL || env.SUPABASE_URL || DEFAULT_SUPABASE_URL).trim();
  const publishableKey = (
    env.VITE_SUPABASE_ANON_KEY || 
    env.VITE_SUPABASE_PUBLISHABLE_KEY || 
    env.SUPABASE_ANON_KEY || 
    DEFAULT_SUPABASE_PUBLISHABLE_KEY
  ).trim();
  const secretKey = (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || DEFAULT_SUPABASE_SECRET_KEY).trim();

  return { url, publishableKey, secretKey };
}
