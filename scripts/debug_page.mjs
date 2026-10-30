import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 960 });

  await page.goto('http://localhost:5173/payments', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));

  const pageInfo = await page.evaluate(() => {
    return {
      h1: document.querySelector('h1')?.innerText,
      h2: document.querySelector('h2')?.innerText,
      bodyText: document.body.innerText.slice(0, 500)
    };
  });
  console.log('Page info:', pageInfo);
  await browser.close();
})();

