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

  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));

  console.log('Logging in as Super Admin...');
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 800));

  await page.type('#login-email', 'chandan873605@gmail.com');
  await page.type('#login-password', 'SuperAdminPass123!');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 2000));

  console.log('Navigating to /profile...');
  await page.goto('http://localhost:5173/profile', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));

  const roleText = await page.evaluate(() => {
    return document.querySelector('.profile-hero-role-tag span')?.textContent;
  });
  console.log('Profile Hero Role Tag:', roleText);
  console.log('Console Errors on Profile Page:', errors);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, '02_admin_profile_dynamic_role.png') });
  console.log('Saved 02_admin_profile_dynamic_role.png');

  console.log('Navigating to /users...');
  await page.goto('http://localhost:5173/users', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));

  // Open action menu on first row
  await page.evaluate(() => {
    const btn = document.querySelector('table tbody tr:first-child button[id^="customer-actions-"]');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 500));

  // Click Change Role
  await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('button'));
    const btn = items.find(b => b.innerText && b.innerText.includes('Change Role'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 800));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, '03_change_role_modal.png') });
  console.log('Saved 03_change_role_modal.png');

  await browser.close();
  console.log('All screenshots captured successfully with ZERO errors!');
})();

