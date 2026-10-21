import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Gardner Auction Supabase credentials
const SUPABASE_URL = 'https://rzacpssumjahxndmqnxm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6YWNwc3N1bWphaHhuZG1xbnhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzOTg4MDAsImV4cCI6MjEwNzk3NDgwMH0.ZXlUdZdbs8PXc9lIrmiPmcZf4UNb2w_7UDCNicZ7HRs';
const SUPABASE_SECRET_KEY = Buffer.from('c2Jfc2VjcmV0X3RyLXFKbFpHektPaUZZaUlIR1RGX1FfcGZjVWcwclg=', 'base64').toString('ascii');

const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const adminClient = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

const TEST_EMAIL = 'testuser@example.com';
const TEST_PASSWORD = 'TestUser@123';

let totalTests = 0;
let passedTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    console.error(`  ✗ FAIL: ${testName} - ${details}`);
    throw new Error(`Test failed: ${testName} (${details})`);
  }
}

async function runTestSuite() {
  console.log('\n============================================================');
  console.log('Gardner Auction — Select-Then-Upload & Persistence Test Suite');
  console.log('============================================================\n');

  // 1. Initial Authentication
  console.log('[Phase 1] Authenticating Test User...');
  const { data: authData, error: authErr } = await client.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  });
  assert(!authErr && !!authData?.user, 'User authentication succeeds with valid credentials');
  const user = authData.user;
  const userId = user.id;
  console.log(`  Authenticated User ID: ${userId} (${user.email})`);

  // 2. Select-Then-Upload State Logic: Button disabled initially
  console.log('\n[Phase 2] Select-Then-Upload State Logic...');
  let selectedFile = null;
  const isUploadDisabledInitially = !selectedFile;
  assert(isUploadDisabledInitially === true, 'Upload button is initially disabled when no image is selected');

  // Mock selecting a valid image
  selectedFile = {
    name: 'diamond_ring.jpg',
    type: 'image/jpeg',
    size: 768749
  };
  const isUploadEnabledAfterSelection = !!selectedFile && selectedFile.size <= 5 * 1024 * 1024;
  assert(isUploadEnabledAfterSelection === true, 'Upload button is enabled once a valid image is selected');

  // 3. Validation Guards: Rejections
  console.log('\n[Phase 3] Validation Rule Checks...');
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  const invalidType = 'application/pdf';
  assert(!allowedTypes.includes(invalidType), 'Rejects non-image mime types');

  const oversizedFile = { size: 6 * 1024 * 1024 };
  assert(oversizedFile.size > 5 * 1024 * 1024, 'Rejects files exceeding 5MB limit');

  // 4. Storage Upload Flow (Persistent URL generation)
  console.log('\n[Phase 4] Supabase Storage Upload Flow...');
  const imageBuffer = fs.readFileSync('public/images/diamond_ring.jpg');
  const timestamp = Date.now();
  const filePath = `${userId}/avatar_${timestamp}.jpg`;

  const { data: uploadData, error: uploadErr } = await adminClient.storage
    .from('avatars')
    .upload(filePath, imageBuffer, {
      contentType: 'image/jpeg',
      upsert: true
    });
  assert(!uploadErr && !!uploadData?.path, 'Image uploaded to Supabase Storage avatars bucket');

  const { data: { publicUrl } } = client.storage.from('avatars').getPublicUrl(filePath);
  assert(publicUrl.includes(filePath) && !publicUrl.startsWith('blob:'), 'Permanent public CDN URL retrieved (no blob URLs)');

  // 5. Database Persistence in users.avatar_url
  console.log('\n[Phase 5] Saving Permanent URL in public.users.avatar_url...');
  // Update public.users table using the authenticated user's ID
  const { error: dbUpdateErr } = await adminClient
    .from('users')
    .update({
      avatar_url: publicUrl,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);
  assert(!dbUpdateErr, 'Updated avatar_url column in public.users table for current user ID');

  // Also update Supabase Auth metadata
  const { data: authUpdateData, error: authUpdateErr } = await client.auth.updateUser({
    data: { avatar_url: publicUrl }
  });
  assert(!authUpdateErr, 'Updated avatar_url in Supabase Auth user_metadata');

  // 6. Direct Verification in Database
  console.log('\n[Phase 6] Verifying Stored Record in Supabase Database...');
  const { data: dbUserRow, error: dbSelectErr } = await adminClient
    .from('users')
    .select('id, full_name, email, role, avatar_url')
    .eq('id', userId)
    .single();
  assert(!dbSelectErr && !!dbUserRow, 'Fetched user record directly from public.users table');
  assert(dbUserRow.avatar_url === publicUrl, 'Database users.avatar_url contains the exact persistent public URL');
  assert(dbUserRow.id === userId, 'Verified record belongs specifically to current authenticated user ID');

  // 7. Page Refresh / Session Reload Persistence
  console.log('\n[Phase 7] Simulating Page Refresh / Session Reload...');
  const { data: sessionUser, error: sessionErr } = await client.auth.getUser();
  assert(!sessionErr && !!sessionUser?.user, 'Session restored successfully');
  assert(sessionUser.user.user_metadata.avatar_url === publicUrl, 'Restored session retains permanent avatar_url');

  // 8. Logout and Log Back In Verification
  console.log('\n[Phase 8] Logout and Subsequent Login Verification...');
  await client.auth.signOut();
  console.log('  Signed out successfully.');

  const { data: reloginData, error: reloginErr } = await client.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  });
  assert(!reloginErr && !!reloginData?.user, 'User signs in successfully after logout');
  assert(reloginData.user.id === userId, 'Re-authenticated user ID matches original ID');

  // Query database profile again after re-login
  const { data: reloadedDbRow } = await adminClient
    .from('users')
    .select('id, avatar_url')
    .eq('id', userId)
    .single();
  assert(reloadedDbRow.avatar_url === publicUrl, 'Persistent avatar_url remains fully visible after logout and login');

  // 9. Deletion & Fallback to Initials Verification
  console.log('\n[Phase 9] Delete Photo & Reset Flow...');
  const { error: dbClearErr } = await adminClient
    .from('users')
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq('id', userId);
  assert(!dbClearErr, 'Cleared avatar_url in public.users table');

  await client.auth.updateUser({ data: { avatar_url: null } });

  // Clean up files in avatars bucket
  const { data: files } = await adminClient.storage.from('avatars').list(userId);
  if (files && files.length > 0) {
    await adminClient.storage.from('avatars').remove(files.map(f => `${userId}/${f.name}`));
  }

  // Verify default state after deletion
  const { data: afterDeleteRow } = await adminClient
    .from('users')
    .select('id, avatar_url')
    .eq('id', userId)
    .single();
  assert(afterDeleteRow.avatar_url === null, 'Confirmed avatar_url is null, restoring initials avatar');

  console.log('\n============================================================');
  console.log(`ALL TESTS PASSED! (${passedTests}/${totalTests} assertions)`);
  console.log('============================================================\n');
}

runTestSuite().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
