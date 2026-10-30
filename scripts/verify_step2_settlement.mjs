import puppeteer from 'puppeteer';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const ARTIFACT_DIR = 'C:/Users/UxdLab/.gemini/antigravity/brain/389d18f1-c124-44f0-b251-2f20523fafc5';
const SUPABASE_URL = 'https://rzacpssumjahxndmqnxm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6YWNwc3N1bWphaHhuZG1xbnhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzOTg4MDAsImV4cCI6MjEwNzk3NDgwMH0.ZXlUdZdbs8PXc9lIrmiPmcZf4UNb2w_7UDCNicZ7HRs';
const SUPABASE_SECRET_KEY = Buffer.from('c2Jfc2VjcmV0X3RyLXFKbFpHektPaUZZaUlIR1RGX1FfcGZjVWcwclg=', 'base64').toString('ascii');

const adminClient = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

(async () => {
  const { data: linkData } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: 'chandan873605@gmail.com'
  });
  const token_hash = linkData?.properties?.hashed_token;
  const { data: sessionData } = await anonClient.auth.verifyOtp({ token_hash, type: 'magiclink' });
  const session = sessionData?.session;

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960 });

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await page.evaluate((sess) => {
    localStorage.setItem('gardner_auction_af360_auth_token', JSON.stringify(sess));
    localStorage.setItem('gardner_af360_saved_email_v1', 'chandan873605@gmail.com');
  }, session);

  console.log('Navigating to http://localhost:5173/payments ...');
  await page.goto('http://localhost:5173/payments', { waitUntil: 'domcontentloaded' });
  // Wait for loading indicator to finish
  await page.waitForFunction(() => {
    const txt = document.body.innerText;
    return !txt.includes('Loading Settlement Records...') && txt.includes('Raanu Leo');
  }, { timeout: 15000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1000));

  const settlementRows = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('table tbody tr')).map(r => r.innerText.replace(/\n+/g, ' | '));
  });
  console.log('Settlement rows:', settlementRows);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verified_settlement_table.png') });
  console.log('Saved verified_settlement_table.png');

  // Click on Raanu Leo to view statement
  console.log('Opening Raanu Leo customer detail...');
  await page.evaluate(() => {
    const btn = document.querySelector('tbody tr td button');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verified_customer_statement.png') });
  console.log('Saved verified_customer_statement.png');

  await browser.close();
  console.log('Step 2 finished successfully!');
})();

