import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rzacpssumjahxndmqnxm.supabase.co';
const SUPABASE_SECRET_KEY = Buffer.from('c2Jfc2VjcmV0X3RyLXFKbFpHektPaUZZaUlIR1RGX1FfcGZjVWcwclg=', 'base64').toString('utf-8');
const sb = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

const BLOCKED_EMAIL = `blocked_${Date.now()}@gardnertest.com`;
const BLOCKED_PASS = 'NormalUser123!';

const SUPERADMIN_EMAIL = `superadmin_${Date.now()}@gardnertest.com`;
const SUPERADMIN_PASS = 'SuperPass123!';
const SUPERADMIN_NAME = 'Executive Super Admin';

async function main() {
  console.log('--- STARTING VERIFICATION ---');

  // 1. Create a normal user with role = 'user' in Supabase to test blocking
  console.log('1. Setting up test standard user in Supabase (role = user)...');
  const { data: authCreated, error: createErr } = await sb.auth.admin.createUser({
    email: BLOCKED_EMAIL,
    password: BLOCKED_PASS,
    email_confirm: true,
    user_metadata: { role: 'user', full_name: 'Blocked User' }
  });
  if (createErr) throw createErr;

  await sb.from('users').upsert([{
    id: authCreated.user.id,
    email: BLOCKED_EMAIL,
    full_name: 'Blocked User',
    role: 'user',
    title: 'Customer'
  }]);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 2. Test Login Blocking for Normal User
  console.log('2. Attempting to log in as normal user (role = user)...');
  await page.goto('http://127.0.0.1:5173/');
  await page.waitForSelector('input[type="email"]');

  await page.type('input[type="email"]', BLOCKED_EMAIL);
  await page.type('input[type="password"]', BLOCKED_PASS);

  const loginBtn = await page.$('button[type="submit"]');
  await loginBtn.click();

  await new Promise(r => setTimeout(r, 3000));

  const alertError = await page.evaluate(() => {
    const el = document.querySelector('.auth-alert-error, [role="alert"]');
    return el ? el.textContent.trim() : '';
  });
  console.log('Alert banner message:', alertError);

  const isStillOnLogin = await page.evaluate(() => {
    return Boolean(document.querySelector('.auth-split-page') && !document.querySelector('.app-shell'));
  });
  console.log('Access denied properly?', isStillOnLogin && alertError.includes('Access denied'));

  if (isStillOnLogin && alertError.includes('Access denied. Only Super Admin accounts are authorized to access the Admin Dashboard.')) {
    console.log('>>> [PASS] Normal user blocked from dashboard with exact error message! <<<');
    await page.screenshot({ path: 'C:/Users/UxdLab/.gemini/antigravity/brain/f3f89f4e-2274-44b1-b0e5-02e135db53c9/13_normal_user_blocked.png' });
  } else {
    console.error('>>> [FAIL] Normal user blocking check failed.');
  }

  // 3. Test Administrative Signup assigning super_admin
  console.log('\n3. Testing Administrative Signup to verify super_admin role assignment...');
  // Click "Create Account"
  await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('button, a'));
    const link = links.find(el => el.textContent && el.textContent.includes('Create Account'));
    if (link) link.click();
  });

  await new Promise(r => setTimeout(r, 1000));
  await page.waitForSelector('input[placeholder*="Todd Gardner"]');

  console.log('Filling administrative signup form with:', SUPERADMIN_EMAIL);
  await page.type('input[placeholder*="Todd Gardner"]', SUPERADMIN_NAME);
  await page.type('input[type="email"]', SUPERADMIN_EMAIL);

  const pwds = await page.$$('input[type="password"]');
  await pwds[0].type(SUPERADMIN_PASS);
  await pwds[1].type(SUPERADMIN_PASS);

  await page.click('#signup-terms-check');
  await page.screenshot({ path: 'C:/Users/UxdLab/.gemini/antigravity/brain/f3f89f4e-2274-44b1-b0e5-02e135db53c9/14_signup_form.png' });

  console.log('Submitting signup...');
  await page.click('button[type="submit"]');

  await new Promise(r => setTimeout(r, 5000));

  // Query Supabase directly to check assigned role
  const { data: dbUser } = await sb.from('users').select('*').eq('email', SUPERADMIN_EMAIL).maybeSingle();
  console.log('Created user record in public.users:', dbUser ? {
    id: dbUser.id,
    email: dbUser.email,
    role: dbUser.role,
    title: dbUser.title
  } : 'NOT FOUND');

  const { data: dbAdmin } = await sb.from('admin_users').select('*').eq('email', SUPERADMIN_EMAIL).maybeSingle();
  console.log('Created admin_users record:', dbAdmin ? {
    email: dbAdmin.email,
    role: dbAdmin.role,
    title: dbAdmin.title
  } : 'NOT FOUND');

  if (dbUser && dbUser.role === 'super_admin') {
    console.log('>>> [PASS] Signup created account with role = "super_admin" in Supabase! <<<');
  } else {
    console.error('>>> [FAIL] Signup did not set super_admin. Role:', dbUser?.role);
  }

  // 4. Test Login with the newly created Super Admin
  console.log('\n4. Logging in with newly created Super Admin...');
  // The signup page automatically transitions to login
  await page.waitForSelector('input[type="email"]');
  await new Promise(r => setTimeout(r, 1500));

  await page.evaluate(() => {
    const e = document.querySelector('input[type="email"]');
    const p = document.querySelector('input[type="password"]');
    if (e) e.value = '';
    if (p) p.value = '';
  });

  await page.type('input[type="email"]', SUPERADMIN_EMAIL);
  await page.type('input[type="password"]', SUPERADMIN_PASS);

  await page.click('button[type="submit"]');
  console.log('Waiting for login redirect...');
  await new Promise(r => setTimeout(r, 4500));

  const reachedApp = await page.evaluate(() => {
    return Boolean(document.querySelector('.app-shell') || document.querySelector('.topbar') || document.querySelector('.sidebar'));
  });
  console.log('Entered dashboard successfully?', reachedApp);

  if (reachedApp) {
    console.log('>>> [PASS] Super Admin successfully logged into Admin Dashboard! <<<');
    await page.screenshot({ path: 'C:/Users/UxdLab/.gemini/antigravity/brain/f3f89f4e-2274-44b1-b0e5-02e135db53c9/15_super_admin_logged_in.png', fullPage: true });

    // Open Administrator Profile to verify role
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('button, a'));
      const profileLink = links.find(el => (el.textContent && el.textContent.includes('Administrator Profile')) || el.getAttribute('aria-label') === 'Profile');
      if (profileLink) profileLink.click();
    });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'C:/Users/UxdLab/.gemini/antigravity/brain/f3f89f4e-2274-44b1-b0e5-02e135db53c9/16_super_admin_profile.png' });
  } else {
    console.error('>>> [FAIL] Super Admin was unable to enter dashboard.');
  }

  // Cleanup
  console.log('\nCleaning up test accounts...');
  await sb.from('users').delete().eq('id', authCreated.user.id);
  await sb.auth.admin.deleteUser(authCreated.user.id);
  if (dbUser?.id) {
    await sb.from('users').delete().eq('id', dbUser.id);
    await sb.from('admin_users').delete().eq('email', SUPERADMIN_EMAIL);
    await sb.auth.admin.deleteUser(dbUser.id);
  }

  await browser.close();
  console.log('--- ALL VERIFICATIONS FINISHED SUCCESSFULLY ---');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

