// scrape_missing_laws_worker.cjs
// Worker процес: scrape-ва batch-ово с няколко браузъра (Playwright)

const { chromium } = require('playwright');

process.on('message', async ({ laws, batchSize }) => {
  const results = [];
  const errors = [];

  async function scrapeLawText(url) {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    try {
      await page.goto(url, { timeout: 120000 });
      let text = '';
      const selectors = ['.law-text', '.content', '.container', '.main', '.text', '.body'];
      for (const sel of selectors) {
        if (await page.$(sel)) {
          text = await page.$eval(sel, el => el.innerText);
          if (text && text.length > 0) break;
        }
      }
      if (!text || text.length < 100) {
        text = await page.evaluate(() => document.body.innerText);
      }
      await browser.close();
      return { success: true, text };
    } catch (err) {
      await browser.close();
      return { success: false, error: err.message };
    }
  }

  // Batch-ово scrape-ване
  for (let i = 0; i < laws.length; i += batchSize) {
    const batch = laws.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(async (law) => {
      const result = await scrapeLawText(law.link);
      if (result.success) {
        return { law, text: result.text };
      } else {
        errors.push({ link: law.link, title: law.title, error: result.error });
        return null;
      }
    }));
    for (const r of batchResults) {
      if (r) {
        results.push({
          title: r.law.title,
          link: r.law.link,
          meta: [],
          text: r.text
        });
      }
    }
  }
  process.send({ results, errors });
});
