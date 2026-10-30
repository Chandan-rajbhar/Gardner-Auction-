import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rzacpssumjahxndmqnxm.supabase.co';
const SUPABASE_SECRET_KEY = Buffer.from('c2Jfc2VjcmV0X3RyLXFKbFpHektPaUZZaUlIR1RGX1FfcGZjVWcwclg=', 'base64').toString('ascii');
const client = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

(async () => {
  const { data: aucs } = await client.from('auctions').select('*');
  console.log('Auctions:', aucs);
})();

