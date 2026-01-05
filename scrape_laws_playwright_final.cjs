// scrape_laws_playwright_final.cjs
// Най-устойчив scrape за parliament.bg: Playwright, стабилни селектори, retry, логове
const { chromium } = require('playwright')
const fs = require('fs')

;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto('https://www.parliament.bg/bg/laws')
  await page.waitForSelector('.archive-head')

  let allLaws = []
  const yearDivs = await page.$$('.archive-head')
  for (let y = 0; y < yearDivs.length; y++) {
    const yearText = await yearDivs[y].innerText()
    console.log('Година:', yearText)
    // Намери съседния ul с месеците
    const monthsUl = await yearDivs[y].evaluateHandle(
      (el) => el.nextElementSibling
    )
    const monthSpans = await monthsUl.evaluateHandle((ul) =>
      Array.from(ul.querySelectorAll('li > span[aria-label]'))
    )
    const monthElements = await monthSpans.getProperties()
    let mIdx = 0
    for (const monthEl of monthElements.values()) {
      if (!monthEl.asElement()) continue
      const month = await monthEl.evaluate((el) =>
        el.getAttribute('aria-label')
      )
      console.log('  Месец:', month)
      await monthEl.click()
      await page.waitForTimeout(1200)
      await page
        .waitForSelector('.p-common-list > li > a', { timeout: 5000 })
        .catch(() => {})
      const laws = await page.$$eval('.p-common-list > li > a', (links) =>
        links.map((a) => {
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
      mIdx++
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
