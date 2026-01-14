const fs = require('fs')
const path = require('path')

class FullAutomationSystem {
  constructor() {
    this.batchSize = 50 // Optimized batch size
    this.totalBatches = 0
    this.processedBatches = 0
    this.allLawsToProcess = []
    this.completedLaws = []
    this.failedLaws = []
  }

  async initialize() {
    console.log('🚀 INITIALIZING FULL AUTOMATION SYSTEM')
    console.log('='.repeat(80))

    // Load all laws that need processing
    if (fs.existsSync('./laws_to_rescrape.json')) {
      this.allLawsToProcess = JSON.parse(
        fs.readFileSync('./laws_to_rescrape.json', 'utf8')
      )
    } else {
      console.log(
        '❌ laws_to_rescrape.json not found. Run text validator first.'
      )
      return false
    }

    // Remove already processed laws
    const enhancedDir = './scraped_laws_enhanced'
    if (fs.existsSync(enhancedDir)) {
      const processedFiles = fs
        .readdirSync(enhancedDir)
        .filter((f) => f.endsWith('.json') && !f.includes('summary'))
        .map((f) => f.replace('.json', ''))

      this.completedLaws = processedFiles
      this.allLawsToProcess = this.allLawsToProcess.filter(
        (lawId) => !processedFiles.includes(lawId.toString())
      )
    }

    this.totalBatches = Math.ceil(this.allLawsToProcess.length / this.batchSize)

    console.log(`📊 AUTOMATION OVERVIEW:`)
    console.log(`   Total laws to process: ${this.allLawsToProcess.length}`)
    console.log(`   Already completed: ${this.completedLaws.length}`)
    console.log(`   Batch size: ${this.batchSize}`)
    console.log(`   Total batches needed: ${this.totalBatches}`)
    console.log(
      `   Estimated time: ${Math.round(
        this.totalBatches * this.batchSize * 0.28
      )} minutes\n`
    )

    return true
  }

  createAllBatches() {
    console.log('📦 CREATING ALL BATCH FILES...')
    const batchFiles = []

    for (let i = 0; i < this.totalBatches; i++) {
      const startIndex = i * this.batchSize
      const endIndex = Math.min(
        startIndex + this.batchSize,
        this.allLawsToProcess.length
      )
      const batchLaws = this.allLawsToProcess.slice(startIndex, endIndex)

      const batchFileName = `enhanced_batch_${i + 2}.json` // Start from batch 2
      fs.writeFileSync(batchFileName, JSON.stringify(batchLaws, null, 2))

      batchFiles.push({
        file: batchFileName,
        laws: batchLaws.length,
        startLaw: batchLaws[0],
        endLaw: batchLaws[batchLaws.length - 1],
      })

      console.log(
        `   ✅ Created ${batchFileName}: ${batchLaws.length} laws (${
          batchLaws[0]
        } - ${batchLaws[batchLaws.length - 1]})`
      )
    }

    // Save batch manifest
    fs.writeFileSync(
      'batch_manifest.json',
      JSON.stringify(
        {
          totalBatches: this.totalBatches,
          batchSize: this.batchSize,
          totalLaws: this.allLawsToProcess.length,
          batches: batchFiles,
          created: new Date().toISOString(),
        },
        null,
        2
      )
    )

    console.log(
      `\n📋 Created ${batchFiles.length} batch files. Manifest saved to batch_manifest.json\n`
    )
    return batchFiles
  }

  async processAllBatches() {
    const { EnhancedBatchScraper } = require('./enhanced_scraper.cjs')

    console.log('🎯 STARTING FULL BATCH PROCESSING...')
    console.log('='.repeat(80))

    const manifest = JSON.parse(fs.readFileSync('batch_manifest.json', 'utf8'))
    const results = {
      totalBatches: manifest.totalBatches,
      completedBatches: 0,
      failedBatches: 0,
      totalLaws: manifest.totalLaws,
      successfulLaws: 0,
      failedLaws: 0,
      batchResults: [],
    }

    for (let i = 0; i < manifest.batches.length; i++) {
      const batch = manifest.batches[i]
      console.log(
        `\n[${i + 1}/${manifest.batches.length}] PROCESSING BATCH: ${
          batch.file
        }`
      )
      console.log(
        `   Laws: ${batch.laws} (${batch.startLaw} - ${batch.endLaw})`
      )

      try {
        const lawIds = JSON.parse(fs.readFileSync(batch.file, 'utf8'))

        const scraper = new EnhancedBatchScraper({
          headless: true,
          slowMo: 100, // Faster processing
          timeout: 75000, // 1.25 minutes per law
          maxRetries: 3,
          delay: 2000, // 2 second delays
          waitForContent: 6000, // 6s for content
          scrollDelay: 1000, // 1s between scrolls
          maxScrollAttempts: 6, // 6 scroll attempts
        })

        const batchResult = await scraper.scrapeProblematicLaws(
          lawIds,
          './scraped_laws_enhanced'
        )

        results.completedBatches++
        results.successfulLaws += batchResult.successful
        results.failedLaws += batchResult.failed
        results.batchResults.push({
          batchFile: batch.file,
          successful: batchResult.successful,
          failed: batchResult.failed,
          errors: batchResult.errors,
        })

        console.log(
          `   ✅ Batch completed: ${batchResult.successful}/${batchResult.total} successful`
        )

        // Save progress after each batch
        fs.writeFileSync(
          'automation_progress.json',
          JSON.stringify(results, null, 2)
        )
      } catch (error) {
        console.error(`   ❌ Batch failed: ${error.message}`)
        results.failedBatches++
        results.batchResults.push({
          batchFile: batch.file,
          successful: 0,
          failed: batch.laws,
          error: error.message,
        })
      }

      // Progress summary
      const progress = (((i + 1) / manifest.batches.length) * 100).toFixed(1)
      console.log(
        `\n📊 OVERALL PROGRESS: ${i + 1}/${
          manifest.batches.length
        } batches (${progress}%)`
      )
      console.log(`   ✅ Successful laws: ${results.successfulLaws}`)
      console.log(`   ❌ Failed laws: ${results.failedLaws}`)
      console.log(
        `   📈 Success rate: ${Math.round(
          (results.successfulLaws /
            (results.successfulLaws + results.failedLaws)) *
            100
        )}%`
      )
    }

    return results
  }

  generateFinalReport(results) {
    console.log('\n' + '='.repeat(80))
    console.log('🎉 FULL AUTOMATION COMPLETED')
    console.log('='.repeat(80))

    console.log(`\n📊 FINAL STATISTICS:`)
    console.log(`   Total batches: ${results.totalBatches}`)
    console.log(`   Completed batches: ${results.completedBatches}`)
    console.log(`   Failed batches: ${results.failedBatches}`)
    console.log(
      `   Total laws processed: ${results.successfulLaws + results.failedLaws}`
    )
    console.log(`   ✅ Successful laws: ${results.successfulLaws}`)
    console.log(`   ❌ Failed laws: ${results.failedLaws}`)
    console.log(
      `   📈 Overall success rate: ${Math.round(
        (results.successfulLaws /
          (results.successfulLaws + results.failedLaws)) *
          100
      )}%`
    )

    // Calculate time and data improvements
    const originalStats = this.getOriginalStats()
    const enhancedStats = this.getEnhancedStats()

    console.log(`\n💾 DATA IMPROVEMENT:`)
    console.log(
      `   Original files: ${originalStats.count} (${(
        originalStats.totalSize /
        1024 /
        1024
      ).toFixed(2)} MB)`
    )
    console.log(
      `   Enhanced files: ${enhancedStats.count} (${(
        enhancedStats.totalSize /
        1024 /
        1024
      ).toFixed(2)} MB)`
    )
    console.log(
      `   Data increase: ${(
        (enhancedStats.totalSize / originalStats.totalSize - 1) *
        100
      ).toFixed(0)}%`
    )

    // Save final report
    const finalReport = {
      ...results,
      completionTime: new Date().toISOString(),
      dataStats: {
        original: originalStats,
        enhanced: enhancedStats,
        improvement:
          (
            (enhancedStats.totalSize / originalStats.totalSize - 1) *
            100
          ).toFixed(0) + '%',
      },
    }

    fs.writeFileSync(
      'final_automation_report.json',
      JSON.stringify(finalReport, null, 2)
    )
    console.log(`\n💾 Final report saved: final_automation_report.json`)

    return finalReport
  }

  getOriginalStats() {
    const originalDir = './scraped_laws'
    if (!fs.existsSync(originalDir)) return { count: 0, totalSize: 0 }

    const files = fs.readdirSync(originalDir).filter((f) => f.endsWith('.json'))
    let totalSize = 0
    files.forEach((file) => {
      totalSize += fs.statSync(path.join(originalDir, file)).size
    })

    return { count: files.length, totalSize }
  }

  getEnhancedStats() {
    const enhancedDir = './scraped_laws_enhanced'
    if (!fs.existsSync(enhancedDir)) return { count: 0, totalSize: 0 }

    const files = fs
      .readdirSync(enhancedDir)
      .filter((f) => f.endsWith('.json') && !f.includes('summary'))
    let totalSize = 0
    files.forEach((file) => {
      totalSize += fs.statSync(path.join(enhancedDir, file)).size
    })

    return { count: files.length, totalSize }
  }
}

// Main execution function
async function runFullAutomation() {
  const automation = new FullAutomationSystem()

  try {
    // Initialize
    const initialized = await automation.initialize()
    if (!initialized) {
      console.log('❌ Initialization failed')
      return
    }

    // Create all batch files
    const batches = automation.createAllBatches()
    if (batches.length === 0) {
      console.log(
        '✅ No additional batches needed - all laws already processed!'
      )
      return
    }

    // Process all batches
    console.log('🚀 Starting automated processing of all batches...')
    console.log(
      '⚠️  This will take several hours. Monitor progress in automation_progress.json'
    )

    const results = await automation.processAllBatches()

    // Generate final report
    automation.generateFinalReport(results)

    console.log('\n🎉 FULL AUTOMATION COMPLETED SUCCESSFULLY!')
  } catch (error) {
    console.error('❌ Full automation failed:', error)
    throw error
  }
}

if (require.main === module) {
  runFullAutomation()
    .then(() => {
      console.log('✅ Full automation finished successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Full automation failed:', error.message)
      process.exit(1)
    })
}

module.exports = { FullAutomationSystem, runFullAutomation }
