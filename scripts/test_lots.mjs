import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rzacpssumjahxndmqnxm.supabase.co';
const SUPABASE_SECRET_KEY = Buffer.from('c2Jfc2VjcmV0X3RyLXFKbFpHektPaUZZaUlIR1RGX1FfcGZjVWcwclg=', 'base64').toString('ascii');
const client = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

(async () => {
  const { data: lots1 } = await client.from('lots').select('*').eq('auction_id', 'auc-001');
  console.log('Lots for auc-001:', lots1);

  const { data: lots2 } = await client.from('lots').select('*').eq('auction_id', 'auc-1792654367075');
  console.log('Lots for auc-1792654367075:', lots2);
})();

