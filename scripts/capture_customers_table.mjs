import puppeteer from 'puppeteer';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/UxdLab/.gemini/antigravity/brain/f3f89f4e-2274-44b1-b0e5-02e135db53c9';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 600));

  await page.type('#login-email', 'chandan873605@gmail.com');
  await page.type('#login-password', 'SuperAdminPass123!');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 2000));

  await page.goto('http://localhost:5173/users', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, '04_customers_table_updated_role.png') });
  console.log('Saved 04_customers_table_updated_role.png');

  await browser.close();
})();

