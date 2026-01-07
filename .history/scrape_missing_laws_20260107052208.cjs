// scrape_missing_laws.cjs
// Скрипт за scrape-ване на липсващите закони от missing_laws_before_patch.json и добавяне в chunk файл
// Използва Playwright за scrape

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const missingPath = path.join(__dirname, 'missing_laws_before_patch.json');
const outputChunkPath = path.join(__dirname, 'public', 'all_laws_scraped_missing_chunk.json');
const errorLogPath = path.join(__dirname, 'scrape_errors_log.json');

async function scrapeLawText(url) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto(url, { timeout: 120000 });
    // Опитай да вземеш целия текст на закона
    // Основен селектор за текст: .law-text, .content, .container, .main, .text, .body
    let text = '';
    const selectors = ['.law-text', '.content', '.container', '.main', '.text', '.body'];
    for (const sel of selectors) {
      if (await page.$(sel)) {
        text = await page.$eval(sel, el => el.innerText);
        if (text && text.length > 0) break;
      }
    }
    // Ако не е намерен текст, вземи целия body
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
  const missingLaws = JSON.parse(fs.readFileSync(missingPath, 'utf8'));
  const scrapedLaws = [];
  const errors = [];

  for (const law of missingLaws) {
    console.log('Scraping:', law.link);
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
  }

  fs.writeFileSync(outputChunkPath, JSON.stringify(scrapedLaws, null, 2), 'utf8');
  fs.writeFileSync(errorLogPath, JSON.stringify(errors, null, 2), 'utf8');
  console.log(`Scraped закони: ${scrapedLaws.length}`);
  console.log(`Грешки: ${errors.length}`);
  console.log(`Резултатите са записани в ${outputChunkPath} и ${errorLogPath}`);
}

main();
