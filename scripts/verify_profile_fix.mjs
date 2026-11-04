import puppeteer from 'puppeteer';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/UxdLab/.gemini/antigravity/brain/f3f89f4e-2274-44b1-b0e5-02e135db53c9';

(async () => {
  console.log('Verifying ProfileView fix with Puppeteer...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  try {
    // 1. Log in as Super Admin
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1200));

    // Clear any previous session
    await page.evaluate(() => localStorage.clear());
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1200));

    await page.type('#login-email', 'chandan873605@gmail.com');
    await page.type('#login-password', 'SuperAdminPass123!');
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 2500));

    // 2. Navigate to Profile
    console.log('Navigating to /profile...');
    await page.goto('http://localhost:5173/profile', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2500));

    // Check role badge and info
    const profileData = await page.evaluate(() => {
      const heroTag = document.querySelector('.profile-hero-role-tag span')?.textContent?.trim();
      const heroName = document.querySelector('.profile-hero-name')?.textContent?.trim();
      const roleBoxName = document.querySelector('.role-display-name')?.textContent?.trim();
      const rolePolicy = document.querySelector('.role-display-policy')?.textContent?.trim();
      return { heroTag, heroName, roleBoxName, rolePolicy };
    });

    console.log('Profile Data extracted:', profileData);
    console.log('Console Errors captured:', consoleErrors);

    const hasSupabaseError = consoleErrors.some(e => e.includes('supabase is not defined'));
    console.log('No "supabase is not defined" error:', !hasSupabaseError ? 'PASS' : 'FAIL');
    console.log('Hero tag shows dynamic role:', profileData.heroTag === 'SUPER ADMIN' ? 'PASS' : 'FAIL');

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verified_profile_page.png') });
    console.log('Screenshot saved: verified_profile_page.png');

    // 3. Navigate to Customers (/users) to verify Change Role modal
    console.log('Navigating to /users...');
    await page.goto('http://localhost:5173/users', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 2000));

    // Open row action menu for first customer
    await page.evaluate(() => {
      const btn = document.querySelector('table tbody tr:first-child button[id^="customer-actions-"]');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    // Click Change Role
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('button'));
      const btn = items.find(b => b.innerText && b.innerText.includes('Change Role'));
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    const modalTitle = await page.evaluate(() => {
      return document.querySelector('#change-role-title')?.textContent?.trim();
    });
    console.log('Change Role Modal opened:', modalTitle === 'Change Customer Role' ? 'PASS' : 'FAIL');

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verified_customers_change_role_modal.png') });
    console.log('Screenshot saved: verified_customers_change_role_modal.png');

  } finally {
    await browser.close();
  }
})();

