// scrape_laws_playwright_fixed.cjs
// Playwright scraping with robust selectors for parliament.bg SPA
const { chromium } = require('playwright')
const fs = require('fs')

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  await page.goto('https://www.parliament.bg/bg/laws')
  await page.waitForSelector('.p-archive-list')
  let allLaws = []
  // Вземи всички години (div.archive-head)
  const yearDivs = await page.$$('.archive-head')
  for (let y = 0; y < yearDivs.length; y++) {
    const yearText = await yearDivs[y].innerText()
    console.log('Година:', yearText)
    // Намери всички месеци за тази година (следващ sibling ul > li > span)
    const months = await page.$$eval(
      `.archive-head:nth-of-type(${y + 1}) + ul > li > span[aria-label]`,
      (spans) => spans.map((s) => s.getAttribute('aria-label'))
    )
    for (let m = 0; m < months.length; m++) {
      const month = months[m]
      console.log('  Месец:', month)
      // Кликни на месеца
      const monthSpan = await page.$(
        `.archive-head:nth-of-type(${y + 1}) + ul > li:nth-child(${
          m + 1
        }) > span[aria-label]`
      )
      if (!monthSpan) continue
      await monthSpan.click()
      await page.waitForTimeout(1200)
      // Изчакай списъка със закони
      await page
        .waitForSelector('.p-common-list > li > a', { timeout: 5000 })
        .catch(() => {})
      // Вземи всички закони (заглавие и дата)
      const laws = await page.$$eval('.p-common-list > li > a', (links) =>
        links.map((a) => {
          // Текстът съдържа дата и заглавие на нов ред
          const txt = a.innerText
            .split('\n')
            .map((t) => t.trim())
            .filter(Boolean)
          let date = '',
            title = ''
          if (txt.length === 2) {
            date = txt[0]
            title = txt[1]
          } else if (txt.length === 1) {
            title = txt[0]
          }
          return {
            title,
            date,
            link: a.href,
          }
        })
      )
      console.log(`    -> ${laws.length} закона`)
      allLaws.push(...laws)
    }
  }

  // Премахни дубли
  const unique = []
  const seen = new Set()
  for (const law of allLaws) {
    const key = law.title + '||' + law.date
    if (!seen.has(key)) {
      unique.push(law)
      seen.add(key)
    }
  }

  fs.writeFileSync('all_laws.json', JSON.stringify(unique, null, 2), 'utf8')
  console.log('Готово! Извлечени са', unique.length, 'уникални закона.')
  await browser.close()
})()
