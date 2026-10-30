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

  // -------------------------------------------------------------
  // TEST 1: Settlement & Invoices Dynamic Balance & Detail View
  // -------------------------------------------------------------
  console.log('1. Navigating to Settlement & Invoices (/payments)...');
  await page.goto('http://localhost:5173/payments', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Check table content
  const tableText = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('table tbody tr'));
    return rows.map(r => r.innerText.replace(/\n+/g, ' | '));
  });
  console.log('Settlement rows:', tableText);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verified_settlement_table.png') });
  console.log('Saved verified_settlement_table.png');

  // Click on Raanu Leo to open Customer Settlement Details
  console.log('Opening customer statement for Raanu Leo...');
  await page.evaluate(() => {
    const btn = document.querySelector('tbody tr td button');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verified_customer_statement.png') });
  console.log('Saved verified_customer_statement.png');

  // -------------------------------------------------------------
  // TEST 2: Auction Day - View Details (Dedicated Read-Only Sheet)
  // -------------------------------------------------------------
  console.log('2. Navigating to Auction Day (/live_clerking)...');
  await page.goto('http://localhost:5173/live_clerking', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2500));

  // Switch to Highlander Auction SA4169 or AUC-001 if needed
  const selectedEvent = await page.evaluate(() => {
    const el = document.querySelector('label + div button') || document.querySelector('button');
    return el?.innerText;
  });
  console.log('Active event on clerking desk:', selectedEvent);

  // Look for lots in the clerking table
  const lotsRows = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('table tbody tr'));
    return rows.map(r => r.innerText.replace(/\n+/g, ' | '));
  });
  console.log('Clerking lots rows:', lotsRows);

  // If table has lots, click the 3-dot menu on first row
  let viewOpened = false;
  if (lotsRows.length > 0 && !lotsRows[0].includes('No lots found')) {
    console.log('Clicking 3-dot action on lot...');
    await page.evaluate(() => {
      const btn = document.querySelector('table tbody tr td:last-child button');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 600));

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

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verified_view_details_sheet.png') });
    console.log('Saved verified_view_details_sheet.png');
    viewOpened = true;

    // Close details
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
  } else {
    // If on SA4169 with no lots, switch event to AUC-001
    console.log('Switching to AUC-001...');
    await page.evaluate(() => {
      // Find event selector button
      const allBtns = Array.from(document.querySelectorAll('button'));
      for (const b of allBtns) {
        if (b.textContent && (b.textContent.includes('Highlander') || b.textContent.includes('SA4169'))) {
          b.click();
          break;
        }
      }
    });
    await new Promise(r => setTimeout(r, 600));

    await page.evaluate(() => {
      const options = Array.from(document.querySelectorAll('div, li, button, span'));
      for (const opt of options) {
        if (opt.textContent && opt.textContent.includes('Spring Collector')) {
          opt.click();
          break;
        }
      }
    });
    await new Promise(r => setTimeout(r, 2500));

    // Now click 3-dot
    await page.evaluate(() => {
      const btn = document.querySelector('table tbody tr td:last-child button');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 600));

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

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verified_view_details_sheet.png') });
    console.log('Saved verified_view_details_sheet.png');
    viewOpened = true;

    // Close details
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
  }

  // -------------------------------------------------------------
  // TEST 3: Insufficient Funds Validation & Top-Right Toast
  // -------------------------------------------------------------
  console.log('3. Testing Insufficient Funds Validation...');
  await page.evaluate(() => {
    // Fill Hammer Price with 5000
    const hammerInp = document.querySelector('input[placeholder="0.00"]');
    if (hammerInp) {
      hammerInp.value = '5000';
      hammerInp.dispatchEvent(new Event('input', { bubbles: true }));
      hammerInp.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Fill Bidder Number with 241396
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

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verified_insufficient_funds_toast.png') });
  console.log('Saved verified_insufficient_funds_toast.png');

  // Verify toast position is fixed top-right
  const toastDetails = await page.evaluate(() => {
    const toast = document.querySelector('.af360-toast-card, .toast-card');
    const container = document.querySelector('.toast-container');
    if (!toast || !container) return null;
    const rect = container.getBoundingClientRect();
    const style = window.getComputedStyle(container);
    return {
      top: rect.top,
      right: window.innerWidth - rect.right,
      position: style.position,
      zIndex: style.zIndex,
      text: toast.innerText
    };
  });
  console.log('Toast verification details:', toastDetails);

  await browser.close();
  console.log('Verification finished!');
})();

