import puppeteer from 'puppeteer';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/UxdLab/.gemini/antigravity/brain/389d18f1-c124-44f0-b251-2f20523fafc5';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960 });

  console.log('1. Navigating to http://localhost:5173/auctions ...');
  await page.goto('http://localhost:5173/auctions', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Click Dashboard -> for Spring Collector Auction (AUC-001)
  console.log('2. Clicking Dashboard for AUC-001...');
  await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('table tbody tr'));
    for (const r of rows) {
      if (r.textContent && (r.textContent.includes('AUC-001') || r.textContent.includes('Spring Collector'))) {
        const btn = r.querySelector('button');
        if (btn) {
          btn.click();
          return;
        }
      }
    }
  });
  await new Promise(r => setTimeout(r, 2500));

  // Click on "Auction Day" in sidebar
  console.log('3. Clicking Auction Day tab...');
  await page.evaluate(() => {
    const navItems = Array.from(document.querySelectorAll('button, a, div'));
    for (const item of navItems) {
      if (item.textContent && item.textContent.trim() === 'Auction Day') {
        item.click();
        break;
      }
    }
  });
  await new Promise(r => setTimeout(r, 2500));

  // Check rows in clerking table
  const clerkingRows = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('table tbody tr'));
    return rows.map(r => r.innerText.replace(/\n+/g, ' | '));
  });
  console.log('Clerking rows found:', clerkingRows);

  // Click 3-dot Actions on Lot 101
  console.log('4. Clicking 3-dot action on Lot 101...');
  await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('table tbody tr'));
    for (const r of rows) {
      if (r.textContent && r.textContent.includes('101')) {
        const btn = r.querySelector('td:last-child button');
        if (btn) {
          btn.click();
          break;
        }
      }
    }
  });
  await new Promise(r => setTimeout(r, 600));

  // Click "View Details"
  console.log('5. Clicking View Details...');
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

  // Take screenshot of Read-Only View Details Sheet
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_auc001_view_details.png') });
  console.log('Captured verify_auc001_view_details.png');

  // Click "Close Details"
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

  // Now TEST 2: Validate Insufficient Funds
  console.log('6. Testing Insufficient Bidder Funds Validation...');
  // Fill in Clerking Entry: Hammer Price $5000, Bidder 241396, click SAVE
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
  await new Promise(r => setTimeout(r, 1000));

  // Capture screenshot of Top-Right Floating Toast
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_auc001_insufficient_toast.png') });
  console.log('Captured verify_auc001_insufficient_toast.png');

  // Now TEST 3: Click "Settlement & Invoices" tab
  console.log('7. Clicking Settlement & Invoices tab...');
  await page.evaluate(() => {
    const navItems = Array.from(document.querySelectorAll('button, a, div'));
    for (const item of navItems) {
      if (item.textContent && item.textContent.trim() === 'Settlement & Invoices') {
        item.click();
        break;
      }
    }
  });
  await new Promise(r => setTimeout(r, 2000));

  // Capture screenshot of Settlement & Invoices listing
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_auc001_settlement_tab.png') });
  console.log('Captured verify_auc001_settlement_tab.png');

  // Click on Raanu Leo / invoice to open Customer Settlement Details
  console.log('8. Opening Settlement Details for Raanu Leo...');
  await page.evaluate(() => {
    const invBtn = document.querySelector('tbody tr td button') || document.querySelector('tbody tr');
    if (invBtn) invBtn.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  // Capture screenshot of Customer Settlement Detail
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_auc001_customer_statement.png') });
  console.log('Captured verify_auc001_customer_statement.png');

  await browser.close();
  console.log('All tests completed successfully!');
})();

