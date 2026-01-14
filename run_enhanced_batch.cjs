const { EnhancedBatchScraper } = require('./enhanced_scraper.cjs')
const fs = require('fs')

async function runEnhancedScrapingBatch() {
  const args = process.argv.slice(2)
  const batchFile = args[0] || 'enhanced_batch_1.json'
  const maxLaws = parseInt(args[1]) || 50 // Limit to avoid overwhelming

  const priorityFile = `./${batchFile}`

  if (!fs.existsSync(priorityFile)) {
    console.error(`❌ Batch file not found: ${priorityFile}`)
    console.log(
      'Available files:',
      fs
        .readdirSync('.')
        .filter((f) => f.includes('batch') && f.endsWith('.json'))
    )
    process.exit(1)
  }

  const allLawIds = JSON.parse(fs.readFileSync(priorityFile, 'utf8'))
  const lawIds = allLawIds.slice(0, maxLaws) // Take only first N laws

  console.log(
    `🎯 Starting enhanced scraping of ${lawIds.length} laws from batch file ${batchFile}...`
  )
  console.log(
    `📋 Total ${allLawIds.length} laws in batch, processing all ${lawIds.length}`
  )

  const scraper = new EnhancedBatchScraper({
    headless: true,
    slowMo: 200, // Faster than test
    timeout: 90000, // 1.5 minutes per law
    maxRetries: 3, // 3 attempts per law
    delay: 3000, // 3 second delays
    waitForContent: 8000, // Wait 8s for content
    scrollDelay: 1500, // 1.5s between scrolls
    maxScrollAttempts: 8, // 8 scroll attempts
  })

  try {
    const results = await scraper.scrapeProblematicLaws(
      lawIds,
      './scraped_laws_enhanced'
    )

    console.log(`\n🏁 FINAL RESULTS:`)
    console.log(`   ✅ Successful: ${results.successful}/${results.total}`)
    console.log(`   ❌ Failed: ${results.failed}/${results.total}`)
    console.log(
      `   📈 Success Rate: ${Math.round(
        (results.successful / results.total) * 100
      )}%`
    )

    if (results.failed > 0) {
      console.log(`\n❌ Failed laws:`)
      results.errors.forEach((error) => {
        console.log(`   - ${error.lawId}: ${error.error}`)
      })
    }

    // Update priority list by removing successful laws
    if (results.successful > 0) {
      const successfulIds = lawIds.slice(0, results.successful)
      const remainingIds = allLawIds.filter((id) => !successfulIds.includes(id))

      const backupFile = `${priorityFile}.backup.${Date.now()}`
      fs.writeFileSync(backupFile, JSON.stringify(allLawIds, null, 2))
      fs.writeFileSync(priorityFile, JSON.stringify(remainingIds, null, 2))

      console.log(
        `\n📝 Updated ${priorityFile}: ${allLawIds.length} → ${remainingIds.length} laws`
      )
      console.log(`   💾 Backup saved: ${backupFile}`)
    }

    return results
  } catch (error) {
    console.error('❌ Batch scraping failed:', error)
    throw error
  }
}

if (require.main === module) {
  runEnhancedScrapingBatch()
    .then((results) => {
      console.log('\n🎉 Enhanced batch scraping completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Enhanced batch scraping failed:', error.message)
      process.exit(1)
    })
}
