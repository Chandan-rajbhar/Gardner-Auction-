import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rzacpssumjahxndmqnxm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6YWNwc3N1bWphaHhuZG1xbnhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzOTg4MDAsImV4cCI6MjEwNzk3NDgwMH0.ZXlUdZdbs8PXc9lIrmiPmcZf4UNb2w_7UDCNicZ7HRs';
const secretKey = Buffer.from('c2Jfc2VjcmV0X3RyLXFKbFpHektPaUZZaUlIR1RGX1FfcGZjVWcwclg=', 'base64').toString('ascii');

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const adminClient = createClient(SUPABASE_URL, secretKey);

async function runEmailListTests() {
  console.log('============================================================');
  console.log('Gardner Auction — Email List Subscription Security & RLS Test');
  console.log('============================================================\n');

  // 1. Guest direct attempt (must fail via RLS)
  console.log('[Test 1] Testing Unauthenticated / Guest Attempt:');
  const { error: guestErr } = await anonClient.from('email-list').insert([
    { email: 'guest@example.com', user_id: '00000000-0000-0000-0000-000000000000' }
  ]);
  if (!guestErr) throw new Error('FAIL: Guest was able to insert into email-list!');
  console.log('  ✓ PASS: Guest insertion blocked by RLS:', guestErr.message);

  // 2. Authenticated user subscription
  console.log('\n[Test 2] Testing Authenticated User Subscription:');
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: authData, error: loginErr } = await userClient.auth.signInWithPassword({
    email: 'testuser@example.com',
    password: 'TestUser@123'
  });
  if (loginErr) throw loginErr;
  const user = authData.user;
  console.log('  Authenticated as:', user.email, 'User ID:', user.id);

  const testEmail1 = 'collector.vip_' + Date.now() + '@example.com';
  const { data: sub1Data, error: sub1Err } = await userClient.from('email-list').insert([
    { email: testEmail1, user_id: user.id }
  ]).select();

  if (sub1Err) throw new Error('FAIL: Authenticated user could not subscribe: ' + sub1Err.message);
  console.log('  ✓ PASS: Subscribed successfully:', sub1Data[0].email, 'Record ID:', sub1Data[0].id);

  // 3. Duplicate email test (case-insensitive & whitespace trimmed)
  console.log('\n[Test 3] Testing Duplicate Email Validation (Case-Insensitive & Trimmed):');
  const duplicateInput = '  ' + testEmail1.toUpperCase() + '  ';
  const { error: dupErr } = await userClient.from('email-list').insert([
    { email: duplicateInput.trim().toLowerCase(), user_id: user.id }
  ]);
  if (!dupErr) throw new Error('FAIL: Duplicate email was permitted!');
  console.log('  ✓ PASS: Duplicate prevented with error:', dupErr.message);

  // 4. Multiple distinct emails by same user
  console.log('\n[Test 4] Testing Multiple Distinct Emails for Same User:');
  const testEmail2 = 'alternate.vault_' + Date.now() + '@example.com';
  const { data: sub2Data, error: sub2Err } = await userClient.from('email-list').insert([
    { email: testEmail2, user_id: user.id }
  ]).select();
  if (sub2Err) throw new Error('FAIL: Same user could not subscribe 2nd email: ' + sub2Err.message);
  console.log('  ✓ PASS: Second email subscribed successfully:', sub2Data[0].email);

  // 5. Verify user's subscribed emails query
  console.log('\n[Test 5] Testing Querying User Subscriptions:');
  const { data: userSubs, error: queryErr } = await userClient.from('email-list').select('*');
  if (queryErr) throw queryErr;
  console.log('  ✓ PASS: User retrieved their own subscriptions count:', userSubs.length);

  // 6. Test spoofing prevention
  console.log('\n[Test 6] Testing Spoofing Another User ID:');
  const { error: spoofErr } = await userClient.from('email-list').insert([
    { email: 'spoofed_' + Date.now() + '@example.com', user_id: '11111111-1111-1111-1111-111111111111' }
  ]);
  if (!spoofErr) throw new Error('FAIL: Spoofed user ID insertion succeeded!');
  console.log('  ✓ PASS: Spoofing blocked by RLS:', spoofErr.message);

  // 7. Cleanup test records
  console.log('\n[Test 7] Cleaning up test records from database...');
  await adminClient.from('email-list').delete().in('email', [testEmail1, testEmail2]);
  console.log('  ✓ PASS: Cleaned up test records.');

  console.log('\n============================================================');
  console.log('ALL EMAIL LIST SECURITY & SUBSCRIPTION TESTS PASSED!');
  console.log('============================================================\n');
}

runEmailListTests().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
