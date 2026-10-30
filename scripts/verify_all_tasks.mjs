import puppeteer from 'puppeteer';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/UxdLab/.gemini/antigravity/brain/389d18f1-c124-44f0-b251-2f20523fafc5';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  console.log('Navigating to http://localhost:5173/live_clerking ...');
  await page.goto('http://localhost:5173/live_clerking', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Let's verify lots table
  console.log('Finding 3-dot action on lot...');
  const dotsFound = await page.evaluate(() => {
    // Look for rows with 3-dot buttons
    const rows = Array.from(document.querySelectorAll('table tbody tr'));
    for (const r of rows) {
      if (r.textContent && r.textContent.includes('101')) {
        const btn = r.querySelector('button[aria-label="Actions"]') || r.querySelector('td:last-child button');
        if (btn) {
          btn.click();
          return true;
        }
      }
    }
    // Fallback: click any 3-dot button in last column
    const anyBtn = document.querySelector('tbody tr td:last-child button');
    if (anyBtn) {
      anyBtn.click();
      return true;
    }
    return false;
  });

  console.log('Dots button clicked:', dotsFound);
  await new Promise(r => setTimeout(r, 600));

  // Look for View Details menu item and click it
  const viewClicked = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('button, div, a'));
    for (const item of items) {
      if (item.textContent && item.textContent.trim() === 'View Details') {
        item.click();
        return true;
      }
    }
    return false;
  });

  console.log('View Details clicked:', viewClicked);
  await new Promise(r => setTimeout(r, 1500));

  // Capture screenshot of View Details Drawer
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'test_view_details_drawer.png'), fullPage: true });
  console.log('Captured test_view_details_drawer.png');

  // Verify close details button
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    for (const b of btns) {
      if (b.textContent && b.textContent.includes('Close Details')) {
        b.click();
      }
    }
  });
  await new Promise(r => setTimeout(r, 800));

  // Now Test 2: Validation of insufficient balance
  console.log('Testing Insufficient Bidder Balance Validation in Clerking Entry...');
  await page.evaluate(() => {
    // Fill Hammer Price input
    const hammerInput = document.querySelector('input[placeholder="0.00"]');
    if (hammerInput) {
      hammerInput.value = '5000';
      hammerInput.dispatchEvent(new Event('input', { bubbles: true }));
      hammerInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Fill Bidder Number input
    const bidderInput = document.querySelector('input[placeholder="e.g. 104"]');
    if (bidderInput) {
      bidderInput.value = '241396';
      bidderInput.dispatchEvent(new Event('input', { bubbles: true }));
      bidderInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Click SAVE button
    const saveBtns = Array.from(document.querySelectorAll('button'));
    for (const b of saveBtns) {
      if (b.textContent && b.textContent.trim().toUpperCase() === 'SAVE') {
        b.click();
        break;
      }
    }
  });

  await new Promise(r => setTimeout(r, 1200));

  // Capture screenshot of Top-Right Toast Notification
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'test_insufficient_funds_toast.png'), fullPage: true });
  console.log('Captured test_insufficient_funds_toast.png');

  // Now Test 3: Navigate to Settlement & Invoices
  console.log('Navigating to Settlement & Invoices...');
  await page.goto('http://localhost:5173/settlement', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'test_settlement_dynamic_balance.png'), fullPage: true });
  console.log('Captured test_settlement_dynamic_balance.png');

  await browser.close();
  console.log('Test completed successfully!');
})();
