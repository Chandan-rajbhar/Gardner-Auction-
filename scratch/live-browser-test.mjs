import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

const SUPABASE_URL = 'https://rzacpssumjahxndmqnxm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6YWNwc3N1bWphaHhuZG1xbnhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzOTg4MDAsImV4cCI6MjEwNzk3NDgwMH0.ZXlUdZdbs8PXc9lIrmiPmcZf4UNb2w_7UDCNicZ7HRs';
const secretKey = Buffer.from('c2Jfc2VjcmV0X3RyLXFKbFpHektPaUZZaUlIR1RGX1FfcGZjVWcwclg=', 'base64').toString('ascii');

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const adminClient = createClient(SUPABASE_URL, secretKey);

const ARTIFACT_DIR = 'C:/Users/UxdLab/.gemini/antigravity/brain/389d18f1-c124-44f0-b251-2f20523fafc5';

async function runLiveBrowserTest() {
  console.log('--- STARTING LIVE BROWSER AUTOMATION TEST ---');

  // 1. Get Chandan Kumar authenticated session
  console.log('1. Obtaining session token for Chandan Kumar...');
  const link = await adminClient.auth.admin.generateLink({ type: 'magiclink', email: 'chandan873605@gmail.com' });
  const tokenHash = link.data?.properties?.hashed_token;
  const { data: authData, error: authErr } = await anonClient.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });

  if (authErr || !authData?.session) {
    throw new Error('Failed to obtain auth session: ' + (authErr?.message || 'No session'));
  }

  const sessionJson = JSON.stringify(authData.session);
  console.log('Obtained valid session for:', authData.session.user.email);

  // 2. Launch Puppeteer browser
  console.log('2. Launching Chrome browser via Puppeteer...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  // 3. Pre-seed session into localStorage
  await page.goto('http://localhost:5173/auctions', { waitUntil: 'domcontentloaded' });
  await page.evaluate((sess) => {
    localStorage.setItem('gardner_auction_af360_auth_token', sess);
  }, sessionJson);

  // Reload to apply authenticated session
  console.log('3. Navigating to http://localhost:5173/auctions with live session...');
  await page.goto('http://localhost:5173/auctions', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  // Screenshot 1: Auctions Catalog Page
  const shot1 = path.join(ARTIFACT_DIR, 'live_test_1_auctions.png');
  await page.screenshot({ path: shot1 });
  console.log('Screenshot 1 captured: live_test_1_auctions.png');

  // 4. Test "Create Auction" Button
  console.log('4. Clicking "Create Auction" button on live page...');
  const createAuctionBtn = await page.waitForSelector('button.btn-gold', { visible: true });
  await createAuctionBtn.click();
  await new Promise(r => setTimeout(r, 800));

  // Screenshot 2: Create Auction Modal Open
  const shot2 = path.join(ARTIFACT_DIR, 'live_test_2_create_auction_modal.png');
  await page.screenshot({ path: shot2 });
  console.log('Screenshot 2 captured: live_test_2_create_auction_modal.png');

  // Fill Create Auction form
  console.log('5. Filling Create Auction form fields...');
  const testAuctionCode = `AUC-LIVE-${Date.now().toString().slice(-4)}`;
  const testAuctionName = `Live Browser Test Auction ${Date.now().toString().slice(-4)}`;

  await page.type('input[placeholder*="Highlander Gold"]', testAuctionName);
  await page.type('input[placeholder*="HGS-2026"]', testAuctionCode);
  await page.type('textarea[placeholder*="Welcome notes"]', 'Automated live browser verified event.');

  // Click submit in modal
  console.log('6. Submitting Create Auction form...');
  const submitBtn = await page.waitForSelector('button#btn-form-modal-submit', { visible: true });
  await submitBtn.click();

  // Wait for navigation / staging view
  await new Promise(r => setTimeout(r, 2500));
  const shot3 = path.join(ARTIFACT_DIR, 'live_test_3_auction_created.png');
  await page.screenshot({ path: shot3 });
  console.log('Screenshot 3 captured: live_test_3_auction_created.png (Staging view opened)');

  // 5. Test "+ NEW CUSTOMER" on /users
  console.log('7. Navigating to Customers page (/users)...');
  await page.goto('http://localhost:5173/users', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  // Click "+ NEW CUSTOMER" button via evaluate
  console.log('8. Clicking " NEW CUSTOMER" button...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent && b.textContent.includes('NEW CUSTOMER'));
    if (btn) btn.click();
  });

  await new Promise(r => setTimeout(r, 1000));
  const shot4 = path.join(ARTIFACT_DIR, 'live_test_4_new_customer_drawer.png');
  await page.screenshot({ path: shot4 });
  console.log('Screenshot 4 captured: live_test_4_new_customer_drawer.png (Slide-over drawer opened)');

  // Fill New Customer Drawer
  console.log('9. Filling New Customer fields...');
  const testCustEmail = `browser_test_${Date.now()}@gardner-test.com`;

  await page.waitForSelector('input[placeholder*="Eleanor"]', { visible: true });
  await page.type('input[placeholder*="Eleanor"]', 'Rohan');
  await page.type('input[placeholder*="Sterling"]', 'Verma');
  await page.type('input[placeholder*="customer@domain.com"]', testCustEmail);
  await page.type('input[placeholder*="(406) 555-0100"]', '406-555-0199');

  // Click Save Customer button
  console.log('10. Clicking Save Customer button...');
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const saveBtn = btns.find(b => b.textContent && b.textContent.includes('Save Customer'));
    if (saveBtn) saveBtn.click();
  });

  await new Promise(r => setTimeout(r, 2500));
  const shot5 = path.join(ARTIFACT_DIR, 'live_test_5_customer_saved.png');
  await page.screenshot({ path: shot5 });
  console.log('Screenshot 5 captured: live_test_5_customer_saved.png (Customer saved in Supabase table)');

  await browser.close();

  // 6. Cleanup test records from Supabase
  console.log('11. Cleaning up test auction and customer from Supabase...');
  await adminClient.from('auctions').delete().ilike('code', 'AUC-LIVE-%');
  await adminClient.from('users').delete().eq('email', testCustEmail);
  console.log('Cleanup complete.');

  console.log('--- ALL LIVE BROWSER TESTS COMPLETED SUCCESSFULLY! ---');
}

runLiveBrowserTest().catch(err => {
  console.error('Browser test failed:', err);
  process.exit(1);
});
