import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rzacpssumjahxndmqnxm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6YWNwc3N1bWphaHhuZG1xbnhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzOTg4MDAsImV4cCI6MjEwNzk3NDgwMH0.ZXlUdZdbs8PXc9lIrmiPmcZf4UNb2w_7UDCNicZ7HRs';
const SUPABASE_SECRET_KEY = Buffer.from('c2Jfc2VjcmV0X3RyLXFKbFpHektPaUZZaUlIR1RGX1FfcGZjVWcwclg=', 'base64').toString('ascii');

const adminClient = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

(async () => {
  const { data: linkData } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: 'chandan873605@gmail.com'
  });

  const token_hash = linkData?.properties?.hashed_token;
  console.log('token_hash:', token_hash);

  const { data: sessionData, error } = await anonClient.auth.verifyOtp({
    token_hash,
    type: 'magiclink'
  });

  console.log('Got session:', !!sessionData?.session, error);
  if (sessionData?.session) {
    console.log('Session JSON:', JSON.stringify(sessionData.session).slice(0, 100));
  }
})();

