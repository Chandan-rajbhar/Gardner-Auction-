import puppeteer from 'puppeteer';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/UxdLab/.gemini/antigravity/brain/389d18f1-c124-44f0-b251-2f20523fafc5';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 950 });

  console.log('Navigating to http://localhost:5173/live_clerking ...');
  await page.goto('http://localhost:5173/live_clerking', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Switch to Spring Collector Auction if Highlander Auction is selected
  console.log('Switching auction event...');
  await page.evaluate(() => {
    // Find the select dropdown button for Event Name
    const buttons = Array.from(document.querySelectorAll('button'));
    for (const b of buttons) {
      if (b.textContent && (b.textContent.includes('Highlander') || b.textContent.includes('SA4169') || b.textContent.includes('Select auction event'))) {
        b.click();
        break;
      }
    }
  });
  await new Promise(r => setTimeout(r, 600));

  // Click Spring Collector Auction option in the dropdown list
  await page.evaluate(() => {
    const options = Array.from(document.querySelectorAll('div, li, button, span'));
    for (const opt of options) {
      if (opt.textContent && opt.textContent.includes('Spring Collector Auction') && opt.textContent.includes('AUC-001')) {
        opt.click();
        break;
      }
    }
  });
  await new Promise(r => setTimeout(r, 2000));

  // Verify rows in the clerking table
  const rowCount = await page.evaluate(() => {
    return document.querySelectorAll('table tbody tr').length;
  });
  console.log('Table rows found after event selection:', rowCount);

  // Click 3-dot action menu on lot 101 (or first row)
  console.log('Clicking 3-dot menu...');
  await page.evaluate(() => {
    const tr = document.querySelector('table tbody tr');
    if (tr) {
      const actionBtn = tr.querySelector('td:last-child button');
      if (actionBtn) actionBtn.click();
    }
  });
  await new Promise(r => setTimeout(r, 600));

  // Click 'View Details'
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
  await new Promise(r => setTimeout(r, 1500));

  // Screenshot 1: Dedicated Read-Only View Details Sheet
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_view_details_sheet.png'), fullPage: false });
  console.log('Captured verify_view_details_sheet.png');

  // Dismiss View Details
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

  // TEST 2: Bidder Balance Validation (Insufficient Funds)
  console.log('Testing Insufficient Funds Validation...');
  // Fill Hammer Price with 5000, Bidder with 241396, and click SAVE
  await page.evaluate(() => {
    // Fill Hammer Price
    const hammerInp = document.querySelector('input[placeholder="0.00"]');
    if (hammerInp) {
      hammerInp.value = '5000';
      hammerInp.dispatchEvent(new Event('input', { bubbles: true }));
      hammerInp.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Fill Bidder
    const bidderInp = document.querySelector('input[placeholder="e.g. 104"]');
    if (bidderInp) {
      bidderInp.value = '241396';
      bidderInp.dispatchEvent(new Event('input', { bubbles: true }));
      bidderInp.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Find and click SAVE
    const saveBtns = Array.from(document.querySelectorAll('button'));
    for (const b of saveBtns) {
      if (b.textContent && b.textContent.trim().toUpperCase() === 'SAVE') {
        b.click();
        break;
      }
    }
  });
  await new Promise(r => setTimeout(r, 1200));

  // Screenshot 2: Error Toast in top-right
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_insufficient_funds_toast.png'), fullPage: false });
  console.log('Captured verify_insufficient_funds_toast.png');

  // TEST 3: Settlement & Invoices listing & detail
  console.log('Testing Settlement & Invoices...');
  await page.goto('http://localhost:5173/settlement', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Screenshot 3: Settlement Listing
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_settlement_listing.png'), fullPage: false });
  console.log('Captured verify_settlement_listing.png');

  // Click on customer row / invoice to open customer detail
  await page.evaluate(() => {
    const custBtn = document.querySelector('tbody tr td:nth-child(2) button, tbody tr td:nth-child(2)') ||
                    document.querySelector('button[title*="statement"]') ||
                    document.querySelector('tbody tr');
    if (custBtn) custBtn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  // Screenshot 4: Customer Settlement Detail
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_settlement_detail.png'), fullPage: false });
  console.log('Captured verify_settlement_detail.png');

  await browser.close();
  console.log('All verifications finished!');
})();

