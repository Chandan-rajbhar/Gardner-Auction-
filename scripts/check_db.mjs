import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rzacpssumjahxndmqnxm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6YWNwc3N1bWphaHhuZG1xbnhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzOTg4MDAsImV4cCI6MjEwNzk3NDgwMH0.ZXlUdZdbs8PXc9lIrmiPmcZf4UNb2w_7UDCNicZ7HRs';
const SUPABASE_SECRET_KEY = Buffer.from('c2Jfc2VjcmV0X3RyLXFKbFpHektPaUZZaUlIR1RGX1FfcGZjVWcwclg=', 'base64').toString('ascii');

const client = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

(async () => {
  const { data: aucs } = await client.from('auctions').select('*');
  console.log('Auctions count:', aucs?.length);
  aucs?.forEach(a => console.log('Auction:', a.id, a.code, a.title));

  const { data: lots } = await client.from('lots').select('*');
  console.log('Lots count:', lots?.length);
  lots?.forEach(l => console.log('Lot:', l.id, 'lot_num:', l.lot_number, 'auction_id:', l.auction_id, 'status:', l.status, 'hammer:', l.hammer_price, 'high_bidder:', l.high_bidder_name, l.high_bidder_paddle));
})();

