import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rzacpssumjahxndmqnxm.supabase.co';
const SUPABASE_SECRET_KEY = Buffer.from('c2Jfc2VjcmV0X3RyLXFKbFpHektPaUZZaUlIR1RGX1FfcGZjVWcwclg=', 'base64').toString('ascii');
const client = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

(async () => {
  const { data: invs, error } = await client
    .from('invoices')
    .select(`
      *,
      invoice_lots (*),
      invoice_charges (*)
    `)
    .eq('auction_id', 'auc-001');

  console.log('Invoices for auc-001 count:', invs?.length, error);
  console.log('Invoice data:', JSON.stringify(invs, null, 2));
})();

