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

  console.log('Navigating to http://localhost:5173/payments ...');
  await page.goto('http://localhost:5173/payments', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));

  const rows = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('table tbody tr')).map(r => r.innerText.replace(/\n+/g, ' | '));
  });
  console.log('Payments rows:', rows);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_payments_balance.png') });
  console.log('Captured verify_payments_balance.png');

  await browser.close();
})();

