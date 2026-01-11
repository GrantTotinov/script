/**
 * Robust Bulgarian Laws Scraper using Playwright
 *
 * Features:
 * - Fault-tolerant scraping with retries and timeouts
 * - Proper SPA content loading waits
 * - Memory-efficient processing for long documents
 * - Resume capability (skips already processed laws)
 * - Comprehensive error handling and logging
 * - Rate limiting to avoid server overload
 * - Individual file saving per law
 */

const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')
const {
  createScrapedLaw,
  createFailedLaw,
  extractLawId,
  validateInputLaw,
} = require('./schemas.js')

class BulgarianLawsScraper {
  constructor(options = {}) {
    this.options = {
      // Browser settings
      headless: options.headless !== false,
      userAgent:
        options.userAgent ||
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',

      // Retry and timeout settings
      maxRetries: options.maxRetries || 3,
      pageTimeout: options.pageTimeout || 60000, // 60 seconds
      navigationTimeout: options.navigationTimeout || 30000, // 30 seconds
      selectorTimeout: options.selectorTimeout || 15000, // 15 seconds

      // Rate limiting
      delayBetweenRequests: options.delayBetweenRequests || 2000, // 2 seconds
      concurrency: options.concurrency || 3, // Max concurrent browsers

      // File paths
      outputDir: options.outputDir || path.join(__dirname, 'scraped_laws'),
      failedLogPath:
        options.failedLogPath || path.join(__dirname, 'failed_laws.json'),
      progressLogPath:
        options.progressLogPath ||
        path.join(__dirname, 'scraping_progress.json'),

      // Content extraction settings
      minTextLength: options.minTextLength || 50,
      maxTextLength: options.maxTextLength || 1000000, // 1MB limit

      ...options,
    }

    // Ensure output directory exists
    if (!fs.existsSync(this.options.outputDir)) {
      fs.mkdirSync(this.options.outputDir, { recursive: true })
    }

    this.stats = {
      processed: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      startTime: null,
    }
  }

  /**
   * Main method to scrape a batch of laws
   */
  async scrapeLawsBatch(laws, batchId = 'default') {
    if (!Array.isArray(laws) || laws.length === 0) {
      throw new Error('Laws array is required and must not be empty')
    }

    this.log(`Starting scraper for batch ${batchId} with ${laws.length} laws`)
    this.stats.startTime = new Date()

    // Filter out invalid laws
    const validLaws = laws.filter((law, index) => {
      if (!validateInputLaw(law)) {
        this.log(`Invalid law at index ${index}: ${JSON.stringify(law)}`)
        return false
      }
      return true
    })

    this.log(
      `Processing ${validLaws.length} valid laws (${
        laws.length - validLaws.length
      } skipped as invalid)`
    )

    // Process laws with controlled concurrency
    await this.processLawsWithConcurrency(validLaws, batchId)

    // Save final statistics
    await this.saveBatchProgress(batchId, true)

    this.log(
      `Batch ${batchId} completed: ${this.stats.successful} successful, ${this.stats.failed} failed, ${this.stats.skipped} skipped`
    )

    return {
      batchId,
      total: validLaws.length,
      successful: this.stats.successful,
      failed: this.stats.failed,
      skipped: this.stats.skipped,
      duration: Date.now() - this.stats.startTime.getTime(),
    }
  }

  /**
   * Process laws with controlled concurrency
   */
  async processLawsWithConcurrency(laws, batchId) {
    const semaphore = new Array(this.options.concurrency).fill(null)
    let index = 0

    const processNext = async (workerIndex) => {
      while (index < laws.length) {
        const currentIndex = index++
        const law = laws[currentIndex]

        try {
          await this.scrapeSingleLaw(law, batchId, currentIndex, laws.length)

          // Rate limiting - wait between requests
          if (
            this.options.delayBetweenRequests > 0 &&
            currentIndex < laws.length - 1
          ) {
            await this.delay(this.options.delayBetweenRequests)
          }
        } catch (error) {
          this.log(
            `Worker ${workerIndex} error processing law ${currentIndex}: ${error.message}`
          )
        }

        // Save progress every 10 laws
        if (currentIndex % 10 === 0) {
          await this.saveBatchProgress(batchId, false)
        }
      }
    }

    // Start all workers
    const workers = semaphore.map((_, i) => processNext(i))
    await Promise.all(workers)
  }

  /**
   * Scrape a single law with retries and error handling
   */
  async scrapeSingleLaw(law, batchId, index, total) {
    const lawId = extractLawId(law.link)
    const outputPath = path.join(this.options.outputDir, `${lawId}.json`)

    // Skip if already processed and file exists
    if (fs.existsSync(outputPath)) {
      this.log(
        `[${index + 1}/${total}] Skipping already processed law: ${lawId}`
      )
      this.stats.skipped++
      return
    }

    let lastError = null
    let retryCount = 0

    // Retry loop
    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      let browser = null
      let page = null

      try {
        this.log(
          `[${index + 1}/${total}] Scraping law ${lawId} (attempt ${attempt}/${
            this.options.maxRetries
          })`
        )

        // Launch browser with optimized settings
        browser = await chromium.launch({
          headless: this.options.headless,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu',
          ],
        })

        page = await browser.newPage({
          userAgent: this.options.userAgent,
        })

        // Set timeouts
        page.setDefaultTimeout(this.options.pageTimeout)
        page.setDefaultNavigationTimeout(this.options.navigationTimeout)

        // Navigate to law page
        await page.goto(law.link, {
          waitUntil: 'networkidle',
          timeout: this.options.navigationTimeout,
        })

        // Wait for content to stabilize (SPA handling)
        await this.waitForContentStability(page)

        // Extract law content
        const scrapingData = await this.extractLawContent(page)

        // Create and save scraped law
        const scrapedLaw = createScrapedLaw(law, {
          ...scrapingData,
          retryCount: attempt - 1,
        })

        // Validate content quality
        if (!scrapedLaw.isComplete) {
          throw new Error(
            `Insufficient content extracted (${scrapedLaw.textLength} chars)`
          )
        }

        // Save to individual file
        await this.saveLawToFile(scrapedLaw, outputPath)

        this.log(
          `[${index + 1}/${total}] Successfully scraped law ${lawId} (${
            scrapedLaw.textLength
          } chars)`
        )
        this.stats.successful++
        this.stats.processed++
        return // Success - exit retry loop
      } catch (error) {
        lastError = error
        retryCount = attempt
        this.log(
          `[${
            index + 1
          }/${total}] Attempt ${attempt} failed for law ${lawId}: ${
            error.message
          }`
        )

        // Wait before retry (exponential backoff)
        if (attempt < this.options.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
          await this.delay(delay)
        }
      } finally {
        // Always cleanup browser resources
        if (page) {
          try {
            await page.close()
          } catch (e) {
            this.log(`Error closing page: ${e.message}`)
          }
        }
        if (browser) {
          try {
            await browser.close()
          } catch (e) {
            this.log(`Error closing browser: ${e.message}`)
          }
        }
      }
    }

    // All retries exhausted - log failure
    this.log(
      `[${index + 1}/${total}] Failed to scrape law ${lawId} after ${
        this.options.maxRetries
      } attempts`
    )

    const failedLaw = createFailedLaw(
      law,
      lastError?.message || 'Unknown error',
      retryCount,
      batchId
    )
    await this.logFailedLaw(failedLaw)

    this.stats.failed++
    this.stats.processed++
  }

  /**
   * Wait for content stability in SPA
   */
  async waitForContentStability(page) {
    // Strategy 1: Wait for specific selectors
    const selectors = [
      '.act-body',
      '.law-details',
      '.p-container-title',
      '.content',
    ]

    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, {
          timeout: this.options.selectorTimeout,
          state: 'visible',
        })
        break // Found at least one selector
      } catch (e) {
        // Continue to next selector
      }
    }

    // Strategy 2: Wait for network to be mostly idle
    try {
      await page.waitForLoadState('networkidle', { timeout: 10000 })
    } catch (e) {
      // Network might still be busy, that's okay
    }

    // Strategy 3: Wait for DOM to stabilize
    await page.evaluate(async () => {
      return new Promise((resolve) => {
        let lastBodySize = document.body.innerHTML.length
        let stableCount = 0

        const checkStability = () => {
          const currentSize = document.body.innerHTML.length
          if (currentSize === lastBodySize) {
            stableCount++
            if (stableCount >= 3) {
              // 3 consecutive stable checks
              resolve()
              return
            }
          } else {
            stableCount = 0
            lastBodySize = currentSize
          }

          setTimeout(checkStability, 500)
        }

        // Start checking after initial delay
        setTimeout(checkStability, 1000)

        // Fallback timeout
        setTimeout(resolve, 15000)
      })
    })
  }

  /**
   * Extract law content from the page
   */
  async extractLawContent(page) {
    try {
      // Extract title
      let actualTitle = ''
      try {
        const titleSelectors = ['h1.p-container-title', 'h1', '.title']
        for (const selector of titleSelectors) {
          const elements = await page.locator(selector).all()
          if (elements.length > 0) {
            actualTitle = await elements[0].innerText()
            if (actualTitle.trim()) break
          }
        }
      } catch (e) {
        this.log(`Title extraction failed: ${e.message}`)
      }

      // Extract metadata
      let metadata = []
      try {
        const metaElements = await page.locator('.law-details').all()
        for (const element of metaElements) {
          const text = await element.innerText()
          if (text.trim()) {
            metadata.push(text.trim())
          }
        }
      } catch (e) {
        this.log(`Metadata extraction failed: ${e.message}`)
      }

      // Extract full text with multiple strategies
      let fullText = ''

      // Strategy 1: .act-body (most reliable)
      try {
        const actBody = page.locator('.act-body').first()
        if ((await actBody.count()) > 0) {
          const html = await actBody.innerHTML()
          fullText = this.cleanHtmlText(html)
        }
      } catch (e) {
        this.log(`Act-body extraction failed: ${e.message}`)
      }

      // Strategy 2: .content containers
      if (!fullText || fullText.length < this.options.minTextLength) {
        try {
          const contentSelectors = [
            '.content .law',
            '.content .law-text',
            '.content .law-content',
            '.law-content',
            '.act-content',
          ]

          for (const selector of contentSelectors) {
            const elements = await page.locator(selector).all()
            if (elements.length > 0) {
              fullText = await elements[0].innerText()
              if (fullText.length >= this.options.minTextLength) break
            }
          }
        } catch (e) {
          this.log(`Content selector extraction failed: ${e.message}`)
        }
      }

      // Strategy 3: Fallback to largest content div
      if (!fullText || fullText.length < this.options.minTextLength) {
        try {
          const allTexts = await page.locator('body div').allInnerTexts()
          fullText =
            allTexts
              .filter((text) => text.length > this.options.minTextLength)
              .sort((a, b) => b.length - a.length)[0] || ''
        } catch (e) {
          this.log(`Fallback extraction failed: ${e.message}`)
        }
      }

      // Clean and process the full text
      if (fullText) {
        fullText = this.processLawText(fullText)

        // Enforce max length limit
        if (fullText.length > this.options.maxTextLength) {
          this.log(
            `Text truncated from ${fullText.length} to ${this.options.maxTextLength} chars`
          )
          fullText =
            fullText.substring(0, this.options.maxTextLength) + '\n[TRUNCATED]'
        }
      }

      return {
        actualTitle: actualTitle.trim(),
        metadata,
        fullText: fullText.trim(),
      }
    } catch (error) {
      throw new Error(`Content extraction failed: ${error.message}`)
    }
  }

  /**
   * Clean HTML text by removing tags and entities
   */
  cleanHtmlText(html) {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove script tags
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style tags
      .replace(/<[^>]+>/g, '\n') // Remove all HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&[a-zA-Z0-9#]+;/g, '') // Remove other entities
      .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
      .replace(/^\s+|\s+$/g, '') // Trim whitespace
      .trim()
  }

  /**
   * Process and clean the extracted law text
   */
  processLawText(text) {
    if (!text) return ''

    // Find law start - look for common patterns
    const startPatterns = [
      /(?:^|\n)\s*ЗАКОН\s+(?:ЗА|№)/i,
      /(?:^|\n)\s*УКАЗ\s+№/i,
      /(?:^|\n)\s*Закон\s+за/i,
    ]

    let startIndex = 0
    for (const pattern of startPatterns) {
      const match = text.match(pattern)
      if (match && match.index !== undefined) {
        startIndex = match.index
        break
      }
    }

    // Find law end - look for signature patterns
    const endPatterns = [
      /Председател[\s\S]{0,200}$/i,
      /Министър-председател[\s\S]{0,200}$/i,
      /Издаден[\s\S]{0,100}$/i,
    ]

    let endIndex = text.length
    for (const pattern of endPatterns) {
      const match = text.match(pattern)
      if (match && match.index !== undefined) {
        endIndex = match.index + match[0].length
        break
      }
    }

    return text.slice(startIndex, endIndex).trim()
  }

  /**
   * Save law to individual JSON file
   */
  async saveLawToFile(scrapedLaw, filePath) {
    try {
      const jsonString = JSON.stringify(scrapedLaw, null, 2)
      await fs.promises.writeFile(filePath, jsonString, 'utf8')
    } catch (error) {
      throw new Error(`Failed to save law file: ${error.message}`)
    }
  }

  /**
   * Log a failed law to the failures file
   */
  async logFailedLaw(failedLaw) {
    try {
      let failures = []

      // Read existing failures
      if (fs.existsSync(this.options.failedLogPath)) {
        const content = await fs.promises.readFile(
          this.options.failedLogPath,
          'utf8'
        )
        failures = JSON.parse(content)
      }

      failures.push(failedLaw)

      // Write back to file
      await fs.promises.writeFile(
        this.options.failedLogPath,
        JSON.stringify(failures, null, 2),
        'utf8'
      )
    } catch (error) {
      this.log(`Error logging failed law: ${error.message}`)
    }
  }

  /**
   * Save batch progress
   */
  async saveBatchProgress(batchId, isComplete) {
    const progress = {
      batchId,
      ...this.stats,
      isComplete,
      lastUpdate: new Date().toISOString(),
    }

    try {
      await fs.promises.writeFile(
        this.options.progressLogPath,
        JSON.stringify(progress, null, 2),
        'utf8'
      )
    } catch (error) {
      this.log(`Error saving progress: ${error.message}`)
    }
  }

  /**
   * Utility method for delays
   */
  async delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Logging method with timestamp
   */
  log(message) {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] ${message}`)
  }
}

module.exports = BulgarianLawsScraper
