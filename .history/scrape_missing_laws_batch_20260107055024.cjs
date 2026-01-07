// scrape_missing_laws_batch.cjs
// Scrape-ва всички закони от даден batch файл (missing_laws_batch_X.json)
// Записва резултатите в public/all_laws_scraped_missing_batch_X.json и грешките в scrape_errors_log_batch_X.json

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const batchIdx = process.argv[2];
if (batchIdx === undefined) {
  console.error('Usage: node scrape_missing_laws_batch.cjs <batchIdx>');
  process.exit(1);
}

const batchPath = path.join(__dirname, 'public', `missing_laws_batch_${batchIdx}.json`);
const outputPath = path.join(__dirname, 'public', `all_laws_scraped_missing_batch_${batchIdx}.json`);
const errorPath = path.join(__dirname, `scrape_errors_log_batch_${batchIdx}.json`);

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

async function main() {
  const batch = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
  const scrapedLaws = [];
  const errors = [];
  const BATCH_SIZE = 10; // 10 браузъра паралелно
  for (let i = 0; i < batch.length; i += BATCH_SIZE) {
    const slice = batch.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(slice.map(async (law) => {
      const result = await scrapeLawText(law.link);
      if (result.success) {
        scrapedLaws.push({
          title: law.title,
          link: law.link,
          meta: [],
          text: result.text
        });
      } else {
        errors.push({ link: law.link, title: law.title, error: result.error });
      }
    }));
    fs.writeFileSync(outputPath, JSON.stringify(scrapedLaws, null, 2), 'utf8');
    fs.writeFileSync(errorPath, JSON.stringify(errors, null, 2), 'utf8');
    console.log(`Batch ${batchIdx}: scrape-нати дотук: ${scrapedLaws.length}, грешки: ${errors.length}`);
  }
}

main();
