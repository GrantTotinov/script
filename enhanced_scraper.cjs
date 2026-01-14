const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

class EnhancedLawScraper {
  constructor(options = {}) {
    this.options = {
      headless: options.headless ?? true,
      slowMo: options.slowMo ?? 500, // Slower for problematic laws
      timeout: options.timeout ?? 120000, // 2 minutes timeout
      maxRetries: options.maxRetries ?? 5, // More retries for problems
      delay: options.delay ?? 5000, // Longer delays
      waitForContent: options.waitForContent ?? 10000, // Wait longer for content
      scrollDelay: options.scrollDelay ?? 2000, // Delay between scrolls
      maxScrollAttempts: options.maxScrollAttempts ?? 10, // More scroll attempts
      ...options,
    }

    this.browser = null
    this.page = null
  }

  async init() {
    console.log('🚀 Initializing enhanced scraper for problematic laws...')
    this.browser = await chromium.launch({
      headless: this.options.headless,
      slowMo: this.options.slowMo,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--max-old-space-size=4096', // More memory
      ],
    })

    this.page = await this.browser.newPage()

    // Set longer timeouts
    this.page.setDefaultTimeout(this.options.timeout)
    this.page.setDefaultNavigationTimeout(this.options.timeout)

    // Set user agent and viewport
    await this.page.setExtraHTTPHeaders({
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    })
    await this.page.setViewportSize({ width: 1920, height: 1080 })

    console.log('✅ Enhanced scraper initialized')
  }

  async scrapeLawEnhanced(lawId, url) {
    const startTime = Date.now()
    console.log(`🎯 [Enhanced] Scraping law ${lawId}...`)

    try {
      // Navigate with extended timeout
      console.log(`   ⏳ Navigating to ${url}...`)
      await this.page.goto(url, {
        waitUntil: 'networkidle',
        timeout: this.options.timeout,
      })

      // Wait for initial content
      console.log(`   ⏳ Waiting for content to load...`)
      await this.page.waitForTimeout(this.options.waitForContent)

      // Try multiple selectors for law content
      const contentSelectors = [
        '.content-body',
        '.law-content',
        '#content',
        '.main-content',
        '.article-content',
        'article',
        'main',
        '[class*="content"]',
        '[class*="text"]',
      ]

      let contentElement = null
      for (const selector of contentSelectors) {
        try {
          contentElement = await this.page.$(selector)
          if (contentElement) {
            console.log(`   ✅ Found content using selector: ${selector}`)
            break
          }
        } catch (error) {
          // Continue to next selector
        }
      }

      if (!contentElement) {
        console.log(`   ⚠️  No content element found, using body`)
        contentElement = await this.page.$('body')
      }

      // Enhanced scrolling to load all content
      console.log(`   📜 Performing enhanced scrolling...`)
      await this.enhancedScroll()

      // Wait after scrolling
      await this.page.waitForTimeout(this.options.scrollDelay)

      // Extract title with multiple attempts
      const title = await this.extractTitle()

      // Extract text content with enhanced methods
      const fullText = await this.extractFullTextEnhanced()

      // Extract metadata
      const metadata = await this.extractMetadata()

      const result = {
        title: title || `Law ${lawId}`,
        date: this.extractDateFromTitle(title),
        link: url,
        lawId: lawId,
        actualTitle: 'Закони',
        metadata: metadata,
        fullText: fullText,
        scrapingInfo: {
          method: 'enhanced',
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          textLength: fullText.length,
        },
      }

      console.log(
        `   ✅ Enhanced scraping completed: ${fullText.length} chars in ${
          Date.now() - startTime
        }ms`
      )
      return result
    } catch (error) {
      console.error(
        `   ❌ Enhanced scraping failed for ${lawId}:`,
        error.message
      )
      throw error
    }
  }

  async enhancedScroll() {
    let previousHeight = 0
    let currentHeight = await this.page.evaluate(
      () => document.body.scrollHeight
    )
    let scrollAttempts = 0
    let stableScrollCount = 0

    while (
      scrollAttempts < this.options.maxScrollAttempts &&
      stableScrollCount < 3
    ) {
      // Scroll to bottom
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight)
      })

      // Wait for content to load
      await this.page.waitForTimeout(this.options.scrollDelay)

      // Check if height changed
      previousHeight = currentHeight
      currentHeight = await this.page.evaluate(() => document.body.scrollHeight)

      if (currentHeight === previousHeight) {
        stableScrollCount++
      } else {
        stableScrollCount = 0
      }

      scrollAttempts++
      console.log(
        `     📜 Scroll attempt ${scrollAttempts}: ${currentHeight}px (stable: ${stableScrollCount})`
      )

      // Try clicking "show more" or "load more" buttons
      await this.clickLoadMoreButtons()
    }

    // Final scroll to top to ensure all content is visible
    await this.page.evaluate(() => window.scrollTo(0, 0))
    await this.page.waitForTimeout(1000)
  }

  async clickLoadMoreButtons() {
    const loadMoreSelectors = [
      'button[class*="load"]',
      'button[class*="more"]',
      'a[class*="load"]',
      'a[class*="more"]',
      '[onclick*="load"]',
      '[onclick*="show"]',
    ]

    for (const selector of loadMoreSelectors) {
      try {
        const elements = await this.page.$$(selector)
        for (const element of elements) {
          const text = await element.textContent()
          if (
            text &&
            (text.includes('повече') ||
              text.includes('load') ||
              text.includes('more'))
          ) {
            await element.click()
            await this.page.waitForTimeout(2000)
            console.log(`     🖱️  Clicked load more: ${text}`)
            break
          }
        }
      } catch (error) {
        // Ignore errors from load more buttons
      }
    }
  }

  async extractTitle() {
    const titleSelectors = [
      'h1',
      '.title',
      '.page-title',
      '[class*="title"]',
      'title',
    ]

    for (const selector of titleSelectors) {
      try {
        const title = await this.page.$eval(selector, (el) =>
          el.textContent?.trim()
        )
        if (title && title.length > 10) {
          return title
        }
      } catch (error) {
        // Continue to next selector
      }
    }

    return null
  }

  async extractFullTextEnhanced() {
    // Try multiple extraction strategies
    const strategies = [
      // Strategy 1: Find main content area
      async () => {
        const selectors = [
          '.content-body',
          '.law-content',
          '.main-content',
          'article',
          'main',
        ]
        for (const selector of selectors) {
          try {
            const element = await this.page.$(selector)
            if (element) {
              return await element.evaluate((el) => {
                // Remove scripts, styles, navigation, etc.
                const cloned = el.cloneNode(true)
                const unwanted = cloned.querySelectorAll(
                  'script, style, nav, header, footer, .menu, .navigation, .sidebar'
                )
                unwanted.forEach((el) => el.remove())
                return cloned.textContent?.trim() || ''
              })
            }
          } catch (error) {
            continue
          }
        }
        return null
      },

      // Strategy 2: Extract all paragraph text
      async () => {
        try {
          return await this.page.evaluate(() => {
            const paragraphs = Array.from(
              document.querySelectorAll('p, div, span')
            )
            return paragraphs
              .map((p) => p.textContent?.trim())
              .filter((text) => text && text.length > 20)
              .join('\n\n')
          })
        } catch (error) {
          return null
        }
      },

      // Strategy 3: Clean body text
      async () => {
        try {
          return await this.page.evaluate(() => {
            const body = document.body.cloneNode(true)
            // Remove unwanted elements
            const unwanted = body.querySelectorAll(
              'script, style, nav, header, footer, .menu, .navigation, .sidebar, .ad, .advertisement'
            )
            unwanted.forEach((el) => el.remove())
            return body.textContent?.trim() || ''
          })
        } catch (error) {
          return null
        }
      },
    ]

    // Try each strategy and return the best result
    let bestText = ''
    for (let i = 0; i < strategies.length; i++) {
      try {
        const text = await strategies[i]()
        if (text && text.length > bestText.length) {
          bestText = text
          console.log(
            `     📝 Strategy ${i + 1} extracted ${text.length} chars`
          )
        }
      } catch (error) {
        console.log(`     ⚠️  Strategy ${i + 1} failed:`, error.message)
      }
    }

    // Clean and validate the text
    return this.cleanExtractedText(bestText)
  }

  cleanExtractedText(text) {
    if (!text) return ''

    // Basic cleaning
    text = text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n\s*\n/g, '\n\n') // Normalize line breaks
      .trim()

    // Remove obvious navigation/UI elements
    const linesToRemove = [
      /^(Home|Начало|Menu|Меню|Navigation|Навигация)/i,
      /^(Copyright|Авторски права|©)/i,
      /^(Login|Вход|Register|Регистрация)/i,
    ]

    const lines = text.split('\n')
    const cleanedLines = lines.filter((line) => {
      const trimmedLine = line.trim()
      if (trimmedLine.length < 5) return false

      for (const pattern of linesToRemove) {
        if (pattern.test(trimmedLine)) return false
      }

      return true
    })

    return cleanedLines.join('\n')
  }

  async extractMetadata() {
    try {
      return await this.page.evaluate(() => {
        const metadata = []

        // Look for meta tags
        const metaTags = document.querySelectorAll('meta')
        metaTags.forEach((tag) => {
          const name = tag.getAttribute('name') || tag.getAttribute('property')
          const content = tag.getAttribute('content')
          if (name && content) {
            metadata.push({ name, content })
          }
        })

        return metadata
      })
    } catch (error) {
      return []
    }
  }

  extractDateFromTitle(title) {
    if (!title) return ''

    const datePatterns = [
      /(\d{1,2}\/\d{1,2}\/\d{4})/, // DD/MM/YYYY
      /(\d{1,2}\.\d{1,2}\.\d{4})/, // DD.MM.YYYY
      /(\d{4}-\d{1,2}-\d{1,2})/, // YYYY-MM-DD
    ]

    for (const pattern of datePatterns) {
      const match = title.match(pattern)
      if (match) return match[1]
    }

    return ''
  }

  async close() {
    if (this.browser) {
      await this.browser.close()
    }
  }
}

// Enhanced batch scraper for problematic laws
class EnhancedBatchScraper {
  constructor(options = {}) {
    this.scraper = new EnhancedLawScraper(options)
    this.options = options
  }

  async scrapeProblematicLaws(lawIds, outputDir = './scraped_laws_enhanced') {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    await this.scraper.init()

    const results = {
      total: lawIds.length,
      successful: 0,
      failed: 0,
      errors: [],
    }

    console.log(
      `🎯 Starting enhanced scraping of ${lawIds.length} problematic laws...\n`
    )

    for (let i = 0; i < lawIds.length; i++) {
      const lawId = lawIds[i]
      console.log(`[${i + 1}/${lawIds.length}] Processing law ${lawId}...`)

      let success = false
      let lastError = null

      // Multiple retry attempts with increasing delays
      for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
        try {
          // Reinitialize browser if needed
          if (!this.scraper.browser || !this.scraper.page) {
            console.log(
              `   🔄 Reinitializing browser for attempt ${attempt}...`
            )
            await this.scraper.close()
            await this.scraper.init()
          }

          const url = `https://www.parliament.bg/bg/laws/ID/${lawId}`
          const lawData = await this.scraper.scrapeLawEnhanced(lawId, url)

          // Validate the scraped data
          if (this.validateScrapedData(lawData)) {
            const outputPath = path.join(outputDir, `${lawId}.json`)
            fs.writeFileSync(outputPath, JSON.stringify(lawData, null, 2))

            console.log(`   ✅ Successfully scraped and saved law ${lawId}`)
            results.successful++
            success = true
            break
          } else {
            throw new Error(
              'Validation failed: insufficient or poor quality content'
            )
          }
        } catch (error) {
          lastError = error
          console.log(`   ⚠️  Attempt ${attempt} failed: ${error.message}`)

          if (attempt < this.options.maxRetries) {
            const delay = this.options.delay * attempt // Progressive delay
            console.log(`   ⏳ Waiting ${delay}ms before retry...`)
            await new Promise((resolve) => setTimeout(resolve, delay))
          }
        }
      }

      if (!success) {
        console.log(
          `   ❌ Failed to scrape law ${lawId} after ${this.options.maxRetries} attempts`
        )
        results.failed++
        results.errors.push({
          lawId,
          error: lastError?.message || 'Unknown error',
        })
      }

      // Small delay between laws
      if (i < lawIds.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    }

    await this.scraper.close()

    console.log(`\n📊 Enhanced scraping completed:`)
    console.log(`   Successful: ${results.successful}/${results.total}`)
    console.log(`   Failed: ${results.failed}/${results.total}`)

    // Save results summary
    const summaryPath = path.join(outputDir, 'enhanced_scraping_summary.json')
    fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2))

    return results
  }

  validateScrapedData(lawData) {
    if (!lawData.fullText || lawData.fullText.length < 100) {
      return false
    }

    // Check for law-like content
    const lawKeywords = ['закон', 'член', 'параграф', 'алинея', 'точка']
    const hasLawKeywords = lawKeywords.some((keyword) =>
      lawData.fullText.toLowerCase().includes(keyword)
    )

    return hasLawKeywords
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2)
  const command = args[0]

  if (command === 'scrape-priority') {
    const priority = args[1] || 'high'
    const priorityFile = `./rescrape_priority_${priority}.json`

    if (!fs.existsSync(priorityFile)) {
      console.error(`❌ Priority file not found: ${priorityFile}`)
      console.log('Run text validation first: node text_validator.cjs')
      process.exit(1)
    }

    const lawIds = JSON.parse(fs.readFileSync(priorityFile, 'utf8'))

    const scraper = new EnhancedBatchScraper({
      headless: true,
      slowMo: 1000,
      timeout: 180000, // 3 minutes
      maxRetries: 3,
      delay: 10000, // 10 second delays
      waitForContent: 15000, // Wait 15s for content
      scrollDelay: 3000, // 3s between scrolls
      maxScrollAttempts: 15, // More scroll attempts
    })

    scraper
      .scrapeProblematicLaws(lawIds)
      .then((results) => {
        console.log('✅ Enhanced scraping completed successfully')
        process.exit(0)
      })
      .catch((error) => {
        console.error('❌ Enhanced scraping failed:', error)
        process.exit(1)
      })
  } else {
    console.log(
      'Usage: node enhanced_scraper.cjs scrape-priority [high|medium|critical]'
    )
  }
}

module.exports = { EnhancedLawScraper, EnhancedBatchScraper }
