import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rzacpssumjahxndmqnxm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6YWNwc3N1bWphaHhuZG1xbnhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzOTg4MDAsImV4cCI6MjEwNzk3NDgwMH0.ZXlUdZdbs8PXc9lIrmiPmcZf4UNb2w_7UDCNicZ7HRs';
const secretKey = Buffer.from('c2Jfc2VjcmV0X3RyLXFKbFpHektPaUZZaUlIR1RGX1FfcGZjVWcwclg=', 'base64').toString('ascii');

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const adminClient = createClient(SUPABASE_URL, secretKey);

async function testDashboardBackend() {
  console.log('--- Testing Supabase Connection & Dashboard Core Features ---');

  // 1. Check auctions table with anonClient (what the browser sees)
  console.log('\n[1] Testing AUCTIONS Table (anonClient):');
  const { data: auctions, error: auctionsErr } = await anonClient
    .from('auctions')
    .select('*')
    .order('start_date', { ascending: false });
  
  if (auctionsErr) {
    console.error('Error fetching auctions (anon):', auctionsErr);
  } else {
    console.log(`Found ${auctions?.length || 0} auctions in Supabase:`, auctions.map(a => ({ id: a.id, code: a.code, name: a.name, status: a.status })));
  }

  // 2. Check users table with anonClient (what browser uses for customers)
  console.log('\n[2] Testing USERS Table (anonClient):');
  const { data: users, error: usersErr } = await anonClient
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (usersErr) {
    console.error('Error fetching users (anon):', usersErr);
  } else {
    console.log(`Found ${users?.length || 0} users in Supabase:`);
    users.slice(0, 5).forEach(u => {
      console.log(` - ID: ${u.id}, Email: ${u.email}, Role: ${u.role}, Full Name: ${u.full_name}, CustCode: ${u.customer_code}`);
    });
  }

  // 3. Check lots table
  console.log('\n[3] Testing LOTS Table (anonClient):');
  const { data: lots, error: lotsErr } = await anonClient
    .from('lots')
    .select('*')
    .limit(5);

  if (lotsErr) {
    console.error('Error fetching lots (anon):', lotsErr);
  } else {
    console.log(`Found ${lots?.length || 0} lots sample in Supabase`);
  }

  // 4. Test Customer Creation via anonClient (simulating browser)
  console.log('\n[4] Testing Customer Creation (anonClient):');
  const testCustomerId = crypto.randomUUID();
  const testCustomerEmail = `test_customer_${Date.now()}@example.com`;
  const testCustomerPayload = {
    id: testCustomerId,
    customer_code: `CUST-${Math.floor(100000 + Math.random() * 900000)}`,
    first_name: 'Test',
    last_name: 'Bidder',
    full_name: 'Test Bidder',
    company_name: 'Test Inc',
    phone: '555-123-4567',
    email: testCustomerEmail,
    role: 'user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data: insertCustData, error: insertCustErr } = await anonClient
    .from('users')
    .insert([testCustomerPayload]);

  if (insertCustErr) {
    console.error('FAIL: Insert customer as anonClient failed:', insertCustErr);
  } else {
    console.log('PASS: Insert customer as anonClient succeeded!');
    // Clean up test customer
    const { error: delErr } = await adminClient.from('users').delete().eq('id', testCustomerId);
    console.log('Cleaned up test customer:', delErr ? delErr.message : 'OK');
  }

  // 5. Test Auction Creation via anonClient (simulating browser)
  console.log('\n[5] Testing Auction Creation (anonClient):');
  const testAuctionId = `auc-test-${Date.now()}`;
  const testAuctionPayload = {
    id: testAuctionId,
    code: `AUC-${Date.now().toString().slice(-4)}`,
    name: 'Automated Test Auction',
    description: 'Testing auction creation from script',
    auction_type: 'HiBid',
    status: 'Open',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    currency: 'USD',
    tax_exempt_all: false,
    live_starting_bid_card: 1,
    country: 'United States',
    address1: '123 Main St',
    city: 'Missoula',
    state: 'MT',
    zip: '59801',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data: insertAucData, error: insertAucErr } = await anonClient
    .from('auctions')
    .upsert([testAuctionPayload], { onConflict: 'id' });

  if (insertAucErr) {
    console.error('FAIL: Insert auction as anonClient failed:', insertAucErr);
  } else {
    console.log('PASS: Insert auction as anonClient succeeded!');
    // Clean up test auction
    const { error: delAucErr } = await adminClient.from('auctions').delete().eq('id', testAuctionId);
    console.log('Cleaned up test auction:', delAucErr ? delAucErr.message : 'OK');
  }
}

testDashboardBackend();

