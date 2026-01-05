// Playwright script to extract full text and metadata for each law
// ...existing code...
// Playwright script to extract full text and metadata for each law
const fs = require('fs')
const path = require('path')
const { chromium } = require('playwright')


const inputPath = path.join(__dirname, 'public', 'all_laws.json')
// Get chunk index and total chunks from command line
const chunkIndex = parseInt(process.argv[2] || '0', 10)
const totalChunks = parseInt(process.argv[3] || '1', 10)

// Read all laws and slice out only the chunk for this job
const allLaws = JSON.parse(fs.readFileSync(inputPath, 'utf8'))
const chunkSize = Math.ceil(allLaws.length / totalChunks)
const chunkStart = chunkIndex * chunkSize
const chunkEnd = Math.min((chunkIndex + 1) * chunkSize, allLaws.length)
const laws = allLaws.slice(chunkStart, chunkEnd)

// Output file for this chunk
const outputPath = path.join(__dirname, 'public', `all_laws_full_chunk_${chunkIndex}.json`)

;(async () => {

  const results = []

  // Паралелен scrape с 15 браузъра
  const CONCURRENCY = 10
  let idx = 0
  async function scrapeLaw(law, i) {
    let browser = null
    let page = null
    try {
      browser = await chromium.launch({ headless: true })
      page = await browser.newPage()
      await page.goto(law.link, { timeout: 60000 })
      // Extract law title (avoid strict mode error)
      let title = ''
      try {
        title = await page.locator('h1.p-container-title').first().innerText()
      } catch {
        const h1s = await page.locator('h1').allInnerTexts()
        title = h1s.length > 1 ? h1s[1] : h1s[0]
      }
      let meta = []
      try {
        meta = await page.locator('.law-details').allInnerTexts()
      } catch {
        meta = []
      }
      let fullText = ''
      try {
        // 1. Опитай .act-body (най-чист контейнер за закона)
        if ((await page.locator('.act-body').count()) > 0) {
          // Вземи innerHTML, премахни HTML тагове, остави само текста
          let html = await page.locator('.act-body').first().innerHTML()
          // Премахни всички тагове и декодирай HTML entities
          fullText = html
            .replace(/<[^>]+>/g, '\n')
            .replace(/&nbsp;/g, ' ')
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/\n{2,}/g, '\n')
            .replace(/^[\s\n]+|[\s\n]+$/g, '')
        } else if (
          (await page
            .locator('.content .law, .content .law-text, .content .law-content')
            .count()) > 0
        ) {
          fullText = await page
            .locator('.content .law, .content .law-text, .content .law-content')
            .first()
            .innerText()
        } else {
          // fallback: най-дългият div в body
          const allDivs = await page.locator('body div').allInnerTexts()
          fullText = allDivs.sort((a, b) => b.length - a.length)[0] || ''
        }
      } catch {
        fullText = ''
      }
      // Остави само текста от първото срещане на "Закон за ..." или "УКАЗ № ..." до подписа ("Председател ..." или последния bold/align right)
      if (fullText) {
        // Търси начало на закона
        let startMatch = fullText.match(/Закон за [^\n]+|УКАЗ № ?\d+/)
        let startIdx =
          startMatch && startMatch.index !== undefined ? startMatch.index : 0
        // Търси край: подпис или последния bold/align right
        let endIdx = fullText.length
        let endMatch = fullText.match(/Председател[\s\S]+?\n.*\n?$/)
        if (endMatch && endMatch.index !== undefined) {
          endIdx = endMatch.index + endMatch[0].length
        }
        fullText = fullText.slice(startIdx, endIdx).trim()
      }
      const lawObj = {
        ...law,
        title: title ? title.trim() : law.title,
        meta: meta,
        text: fullText ? fullText.trim() : '',
      }
      results[i] = lawObj
      fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8')
      console.log(
        `[${i + 1}/${laws.length}] Extracted: ${law.title} | Total scraped: ${
          results.filter((x) => x).length
        }`
      )
    } catch (err) {
      results[i] = { ...law, text: '', error: err.message }
      fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8')
      console.log(
        `[${i + 1}/${laws.length}] Failed: ${law.title} | Error: ${err.message}`
      )
    } finally {
      if (page)
        try {
          await page.close()
        } catch {}
      if (browser)
        try {
          await browser.close()
        } catch {}
    }
  } // <-- добавена липсваща затваряща скоба

  // Стартирай до CONCURRENCY scrape-та едновременно
  results.length = laws.length
  let running = []
  function next() {
    if (idx >= laws.length) return null
    const i = idx++
    const p = scrapeLaw(laws[i], i).then(() =>
      running.splice(running.indexOf(p), 1)
    )
    running.push(p)
    return p
  }
  // Запълни първите CONCURRENCY scrape-та
  for (let i = 0; i < CONCURRENCY && i < laws.length; i++) next()
  // Когато някое приключи, стартирай следващото
  while (running.length > 0) {
    await Promise.race(running)
    while (running.length < CONCURRENCY && idx < laws.length) next()
  }
  // Финален summary
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8')
  const ok = results.filter((l) => l && l.text && l.text.length > 50).length
  const fail = results.length - ok
  console.log(`Done. Saved to ${outputPath}`)
  console.log(`Chunk: ${chunkIndex + 1}/${totalChunks} | Laws: ${laws.length} | Success: ${ok} | Failed: ${fail}`)
})()
