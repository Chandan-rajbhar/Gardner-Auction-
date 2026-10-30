import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960 });

  await page.goto('http://localhost:5173/payments', { waitUntil: 'networkidle2' });
  await page.waitForSelector('table tbody tr td', { timeout: 8000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));

  const rows = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('table tbody tr')).map(r => r.innerText.replace(/\n+/g, ' | '));
  });
  console.log('Resulting settlement rows:', rows);

  await browser.close();
})();

