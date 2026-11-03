import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rzacpssumjahxndmqnxm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6YWNwc3N1bWphaHhuZG1xbnhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzOTg4MDAsImV4cCI6MjEwNzk3NDgwMH0.ZXlUdZdbs8PXc9lIrmiPmcZf4UNb2w_7UDCNicZ7HRs';
const SECRET_KEY = Buffer.from('c2Jfc2VjcmV0X3RyLXFKbFpHektPaUZZaUlIR1RGX1FfcGZjVWcwclg=', 'base64').toString();

const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SECRET_KEY);

console.log('--- Starting Gardner Auction Notifications E2E Test Suite ---\n');

async function runTests() {
  const timestamp = Date.now();
  const testEmail = `test_subscriber_${timestamp}@example.com`;
  const testRegEmail = `john.smith_${timestamp}@example.com`;
  const testRegName = 'John Smith';

  const cleanupNotifIds = [];
  const cleanupEmails = [];

  try {
    // 0. Get a valid auth user from database
    const { data: { users }, error: listUsersErr } = await supabaseAdmin.auth.admin.listUsers();
    if (listUsersErr || !users || users.length === 0) {
      throw new Error(`Could not list auth users: ${listUsersErr?.message}`);
    }
    const validUserId = users[0].id;
    console.log('✓ Found valid user for foreign key relationship:', validUserId);

    // --------------------------------------------------------------------------
    // Test 1: Email List Subscription Notification
    // --------------------------------------------------------------------------
    console.log('\n[Test 1] Testing Email List Subscription...');

    // 1.1 Insert into email-list table using admin client
    const { data: subData, error: subError } = await supabaseAdmin
      .from('email-list')
      .insert([
        {
          email: testEmail,
          user_id: validUserId
        }
      ])
      .select();

    if (subError) {
      throw new Error(`Failed to insert into email-list: ${subError.message}`);
    }
    console.log('✓ Successfully inserted subscriber into email-list:', testEmail);
    cleanupEmails.push(testEmail);
    const subRecordId = subData[0]?.id;

    // 1.2 Insert corresponding notification using standard anon client
    const notifEmailId = `notif-email-${subRecordId}`;
    const emailNotifPayload = {
      id: notifEmailId,
      title: 'New Email List Subscriber',
      message: `${testEmail} has subscribed to the Gardner Auction email list.`,
      type: 'system',
      recipient_id: 'admin',
      recipient_role: 'admin',
      related_module: 'email_list',
      related_record_id: subRecordId,
      action_url: '/email_list',
      is_read: false,
      metadata: {
        email: testEmail,
        subscriptionId: subRecordId,
        source: 'website_email_list'
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: notifData1, error: notifErr1 } = await supabaseAnon
      .from('notifications')
      .insert([emailNotifPayload])
      .select();

    if (notifErr1) {
      throw new Error(`Failed to insert Email List Notification: ${notifErr1.message}`);
    }
    console.log('✓ Successfully inserted Email List Notification into notifications table.');
    cleanupNotifIds.push(notifEmailId);

    // 1.3 Verify record exists and matches exact requirements
    const { data: verifyNotif1, error: verifyErr1 } = await supabaseAnon
      .from('notifications')
      .select('*')
      .eq('id', notifEmailId)
      .single();

    if (verifyErr1 || !verifyNotif1) {
      throw new Error(`Email List notification not found in database: ${verifyErr1?.message}`);
    }

    if (verifyNotif1.title !== 'New Email List Subscriber') {
      throw new Error(`Title mismatch: expected "New Email List Subscriber", got "${verifyNotif1.title}"`);
    }
    if (verifyNotif1.message !== `${testEmail} has subscribed to the Gardner Auction email list.`) {
      throw new Error(`Message mismatch: got "${verifyNotif1.message}"`);
    }
    if (verifyNotif1.type !== 'system') {
      throw new Error(`Type mismatch: expected "system", got "${verifyNotif1.type}"`);
    }
    if (verifyNotif1.recipient_role !== 'admin') {
      throw new Error(`Recipient mismatch: expected "admin", got "${verifyNotif1.recipient_role}"`);
    }
    if (verifyNotif1.is_read !== false) {
      throw new Error(`Status mismatch: expected is_read to be false`);
    }
    console.log('✓ Verified Email List Notification fields match all specifications.');

    // 1.4 Test duplicate prevention on retry
    console.log('\n[Test 1.4] Testing duplicate subscription suppression...');
    const { data: dupData, error: dupError } = await supabaseAnon
      .from('notifications')
      .insert([emailNotifPayload])
      .select();

    if (!dupError && dupData && dupData.length > 0) {
      throw new Error('FAIL: Duplicate notification with same ID was inserted!');
    }
    console.log('✓ Confirmed: Primary key constraint and deduplication prevented duplicate notification.');

    // --------------------------------------------------------------------------
    // Test 2: New User Registration Notification
    // --------------------------------------------------------------------------
    console.log('\n[Test 2] Testing New User Registration Notification...');

    const testNewUserId = `test-user-${timestamp}`;
    const notifUserId = `notif-user-${testNewUserId}`;
    const userNotifPayload = {
      id: notifUserId,
      title: 'New User Registration',
      message: `${testRegName} (${testRegEmail}) has successfully created a new bidder account.`,
      type: 'system',
      recipient_id: 'admin',
      recipient_role: 'admin',
      related_module: 'users',
      related_record_id: testNewUserId,
      action_url: '/users',
      is_read: false,
      metadata: {
        userId: testNewUserId,
        name: testRegName,
        email: testRegEmail,
        source: 'bidder_registration'
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: notifData2, error: notifErr2 } = await supabaseAnon
      .from('notifications')
      .insert([userNotifPayload])
      .select();

    if (notifErr2) {
      throw new Error(`Failed to insert Registration Notification: ${notifErr2.message}`);
    }
    console.log('✓ Successfully inserted Registration Notification into notifications table.');
    cleanupNotifIds.push(notifUserId);

    // 2.1 Verify registration notification in Supabase
    const { data: verifyNotif2, error: verifyErr2 } = await supabaseAnon
      .from('notifications')
      .select('*')
      .eq('id', notifUserId)
      .single();

    if (verifyErr2 || !verifyNotif2) {
      throw new Error(`Registration notification not found in database: ${verifyErr2?.message}`);
    }

    if (verifyNotif2.title !== 'New User Registration') {
      throw new Error(`Title mismatch: expected "New User Registration", got "${verifyNotif2.title}"`);
    }
    if (verifyNotif2.message !== `${testRegName} (${testRegEmail}) has successfully created a new bidder account.`) {
      throw new Error(`Message mismatch: got "${verifyNotif2.message}"`);
    }
    if (verifyNotif2.type !== 'system') {
      throw new Error(`Type mismatch: expected "system", got "${verifyNotif2.type}"`);
    }
    if (verifyNotif2.related_module !== 'users') {
      throw new Error(`Related module mismatch: expected "users", got "${verifyNotif2.related_module}"`);
    }
    console.log('✓ Verified New User Registration Notification fields match all specifications.');

    // 2.2 Test duplicate prevention on registration retry
    console.log('\n[Test 2.2] Testing duplicate registration notification suppression...');
    const { data: dupUserNotif, error: dupUserErr } = await supabaseAnon
      .from('notifications')
      .insert([userNotifPayload])
      .select();

    if (!dupUserErr && dupUserNotif && dupUserNotif.length > 0) {
      throw new Error('FAIL: Duplicate user registration notification was inserted!');
    }
    console.log('✓ Confirmed: Registration retry duplicate prevented.');

    // --------------------------------------------------------------------------
    // Test 3: Admin Dashboard Notifications Flow & Operations
    // --------------------------------------------------------------------------
    console.log('\n[Test 3] Testing Admin Dashboard Notification Operations...');

    // 3.1 Fetch all notifications (simulating getNotifications())
    const { data: allNotifs, error: allErr } = await supabaseAnon
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (allErr) throw allErr;
    console.log(`✓ Fetched ${allNotifs.length} notifications from Supabase.`);

    const foundEmailNotif = allNotifs.find(n => n.id === notifEmailId);
    const foundUserNotif = allNotifs.find(n => n.id === notifUserId);

    if (!foundEmailNotif) throw new Error('Email List notification missing from dashboard feed!');
    if (!foundUserNotif) throw new Error('User Registration notification missing from dashboard feed!');
    console.log('✓ Both website notifications appear in the dashboard feed.');

    // 3.2 Test Unread Count calculation
    const unreadCount = allNotifs.filter(n => !n.is_read).length;
    console.log(`✓ Unread notifications count dynamically computed: ${unreadCount}`);

    // 3.3 Test Mark as Read on individual notification
    const { error: markReadErr } = await supabaseAnon
      .from('notifications')
      .update({ is_read: true, updated_at: new Date().toISOString() })
      .eq('id', notifEmailId);

    if (markReadErr) throw markReadErr;

    const { data: readCheck } = await supabaseAnon
      .from('notifications')
      .select('is_read')
      .eq('id', notifEmailId)
      .single();

    if (!readCheck?.is_read) throw new Error('Mark as Read failed to update is_read to true!');
    console.log('✓ Mark as Read successfully updated notification status to read.');

    // 3.4 Test Mark as Unread
    const { error: markUnreadErr } = await supabaseAnon
      .from('notifications')
      .update({ is_read: false, updated_at: new Date().toISOString() })
      .eq('id', notifEmailId);

    if (markUnreadErr) throw markUnreadErr;

    const { data: unreadCheck } = await supabaseAnon
      .from('notifications')
      .select('is_read')
      .eq('id', notifEmailId)
      .single();

    if (unreadCheck?.is_read !== false) throw new Error('Mark as Unread failed to restore is_read to false!');
    console.log('✓ Mark as Unread successfully toggled status back to unread.');

    // 3.5 Test Navigation metadata mapping
    if (foundEmailNotif.related_module !== 'email_list' || foundEmailNotif.action_url !== '/email_list') {
      throw new Error('Email list notification navigation targets incorrect module!');
    }
    if (foundUserNotif.related_module !== 'users' || foundUserNotif.action_url !== '/users') {
      throw new Error('User registration notification navigation targets incorrect module!');
    }
    console.log('✓ Notification navigation targets correctly mapped to "email_list" and "users" modules.');

    console.log('\n============================================================');
    console.log('🎉 ALL END-TO-END NOTIFICATION TESTS PASSED SUCCESSFULLY! 🎉');
    console.log('============================================================\n');

  } catch (err) {
    console.error('\n❌ Test Failure:', err.message);
    process.exitCode = 1;
  } finally {
    console.log('Cleaning up test data from Supabase...');
    if (cleanupNotifIds.length > 0) {
      await supabaseAdmin.from('notifications').delete().in('id', cleanupNotifIds);
      console.log('✓ Cleaned up test notifications:', cleanupNotifIds);
    }
    if (cleanupEmails.length > 0) {
      await supabaseAdmin.from('email-list').delete().in('email', cleanupEmails);
      console.log('✓ Cleaned up test email subscriptions:', cleanupEmails);
    }
    console.log('Cleanup finished.');
  }
}

runTests();
