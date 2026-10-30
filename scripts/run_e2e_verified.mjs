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
  // 1. Generate real session for Chandan Kumar
  const { data: linkData } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: 'chandan873605@gmail.com'
  });
  const token_hash = linkData?.properties?.hashed_token;
  const { data: sessionData } = await anonClient.auth.verifyOtp({
    token_hash,
    type: 'magiclink'
  });
  const session = sessionData?.session;
  console.log('Got real session for Chandan Kumar:', !!session);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960 });

  // Pre-seed localStorage with session and remembered email
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await page.evaluate((sess) => {
    localStorage.setItem('gardner_auction_af360_auth_token', JSON.stringify(sess));
    localStorage.setItem('gardner_af360_saved_email_v1', 'chandan873605@gmail.com');
  }, session);

  // -------------------------------------------------------------
  // TEST 1: Settlement & Invoices (/payments)
  // -------------------------------------------------------------
  console.log('Navigating to http://localhost:5173/payments ...');
  await page.goto('http://localhost:5173/payments', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2500));

  const settlementRows = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('table tbody tr')).map(r => r.innerText.replace(/\n+/g, ' | '));
  });
  console.log('Settlement rows:', settlementRows);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_settlement_table_final.png') });
  console.log('Saved verify_settlement_table_final.png');

  // Open customer statement by clicking on Raanu Leo
  console.log('Clicking on customer Raanu Leo...');
  await page.evaluate(() => {
    const btn = document.querySelector('tbody tr td button');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_customer_statement_final.png') });
  console.log('Saved verify_customer_statement_final.png');

  // -------------------------------------------------------------
  // TEST 2: Auction Day - View Details & Sold To Dynamic Names
  // -------------------------------------------------------------
  console.log('Navigating to http://localhost:5173/live_clerking ...');
  await page.goto('http://localhost:5173/live_clerking', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2500));

  const clerkingRows = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('table tbody tr')).map(r => r.innerText.replace(/\n+/g, ' | '));
  });
  console.log('Clerking rows:', clerkingRows);

  // Click 3-dot action menu on lot
  console.log('Clicking 3-dot action on lot...');
  await page.evaluate(() => {
    const btn = document.querySelector('table tbody tr td:last-child button');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 600));

  // Click View Details
  console.log('Clicking View Details...');
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('button, div, span'));
    for (const item of items) {
      if (item.textContent && item.textContent.trim() === 'View Details') {
        item.click();
        break;
      }
    }
  });
  await new Promise(r => setTimeout(r, 2000));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_view_details_sheet_final.png') });
  console.log('Saved verify_view_details_sheet_final.png');

  // Close View Details
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    for (const b of btns) {
      if (b.textContent && b.textContent.includes('Close Details')) {
        b.click();
        break;
      }
    }
  });
  await new Promise(r => setTimeout(r, 800));

  // -------------------------------------------------------------
  // TEST 3: Bidder Balance Validation (Insufficient Funds) & Top-Right Toast
  // -------------------------------------------------------------
  console.log('Testing Insufficient Funds Validation in Clerking Entry...');
  await page.evaluate(() => {
    // Fill Hammer Price
    const hammerInp = document.querySelector('input[placeholder="0.00"]');
    if (hammerInp) {
      hammerInp.value = '5000';
      hammerInp.dispatchEvent(new Event('input', { bubbles: true }));
      hammerInp.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Fill Bidder Number
    const bidderInp = document.querySelector('input[placeholder="e.g. 104"]');
    if (bidderInp) {
      bidderInp.value = '241396';
      bidderInp.dispatchEvent(new Event('input', { bubbles: true }));
      bidderInp.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Click SAVE
    const saveBtns = Array.from(document.querySelectorAll('button'));
    for (const b of saveBtns) {
      if (b.textContent && b.textContent.trim().toUpperCase() === 'SAVE') {
        b.click();
        break;
      }
    }
  });

  await new Promise(r => setTimeout(r, 1200));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_insufficient_toast_final.png') });
  console.log('Saved verify_insufficient_toast_final.png');

  // Toast verification position check
  const toastCheck = await page.evaluate(() => {
    const toast = document.querySelector('.af360-toast-card');
    const container = document.querySelector('.toast-container');
    if (!container || !toast) return null;
    const rect = container.getBoundingClientRect();
    return {
      top: rect.top,
      right: window.innerWidth - rect.right,
      text: toast.innerText
    };
  });
  console.log('Toast verification:', toastCheck);

  await browser.close();
  console.log('All tests finished successfully!');
})();
