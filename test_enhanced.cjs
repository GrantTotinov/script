const { EnhancedBatchScraper } = require('./enhanced_scraper.cjs')
const fs = require('fs')

async function testEnhancedScraper() {
  const lawIds = JSON.parse(
    fs.readFileSync('./rescrape_priority_test.json', 'utf8')
  )

  console.log(`Testing enhanced scraper with ${lawIds.length} laws...`)

  const scraper = new EnhancedBatchScraper({
    headless: true,
    slowMo: 300,
    timeout: 60000, // 1 minute per law
    maxRetries: 2,
    delay: 3000, // 3 second delays
    waitForContent: 5000, // Wait 5s for content
    scrollDelay: 1500, // 1.5s between scrolls
    maxScrollAttempts: 5, // 5 scroll attempts
  })

  try {
    const results = await scraper.scrapeProblematicLaws(
      lawIds,
      './test_enhanced_output'
    )
    console.log('✅ Test completed successfully:', results)
    return results
  } catch (error) {
    console.error('❌ Test failed:', error)
    throw error
  }
}

if (require.main === module) {
  testEnhancedScraper()
    .then((results) => process.exit(0))
    .catch((error) => process.exit(1))
}

module.exports = { testEnhancedScraper }
