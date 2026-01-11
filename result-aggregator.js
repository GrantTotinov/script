/**
 * Result Aggregator Utility
 *
 * This script aggregates scraped laws from individual JSON files
 * into a single comprehensive dataset with statistics
 */

const fs = require('fs')
const path = require('path')

class ResultAggregator {
  constructor(options = {}) {
    this.scrapedDir = options.scrapedDir || path.join(__dirname, 'scraped_laws')
    this.outputPath =
      options.outputPath || path.join(__dirname, 'aggregated_results.json')
    this.failedLogPath =
      options.failedLogPath || path.join(__dirname, 'failed_laws.json')
  }

  async aggregate() {
    console.log('🔄 Aggregating scraped laws...')

    if (!fs.existsSync(this.scrapedDir)) {
      throw new Error(`Scraped directory not found: ${this.scrapedDir}`)
    }

    // Read all scraped law files
    const files = await fs.promises.readdir(this.scrapedDir)
    const lawFiles = files.filter((f) => f.endsWith('.json'))

    console.log(`Found ${lawFiles.length} scraped law files`)

    const scrapedLaws = []
    const stats = {
      total: 0,
      successful: 0,
      withErrors: 0,
      totalTextLength: 0,
      minTextLength: Infinity,
      maxTextLength: 0,
      averageTextLength: 0,
    }

    // Process each file
    for (const file of lawFiles) {
      try {
        const filePath = path.join(this.scrapedDir, file)
        const content = await fs.promises.readFile(filePath, 'utf8')
        const law = JSON.parse(content)

        scrapedLaws.push(law)
        stats.total++

        if (law.isComplete && law.textLength > 50) {
          stats.successful++
          stats.totalTextLength += law.textLength
          stats.minTextLength = Math.min(stats.minTextLength, law.textLength)
          stats.maxTextLength = Math.max(stats.maxTextLength, law.textLength)
        } else {
          stats.withErrors++
        }
      } catch (error) {
        console.error(`Error processing file ${file}:`, error.message)
        stats.withErrors++
      }
    }

    // Calculate average
    if (stats.successful > 0) {
      stats.averageTextLength = Math.round(
        stats.totalTextLength / stats.successful
      )
      stats.minTextLength =
        stats.minTextLength === Infinity ? 0 : stats.minTextLength
    } else {
      stats.minTextLength = 0
    }

    // Load failed laws if exists
    let failedLaws = []
    if (fs.existsSync(this.failedLogPath)) {
      const failedContent = await fs.promises.readFile(
        this.failedLogPath,
        'utf8'
      )
      failedLaws = JSON.parse(failedContent)
    }

    // Sort laws by date (newest first)
    scrapedLaws.sort((a, b) => {
      const dateA = new Date(a.scrapedAt).getTime()
      const dateB = new Date(b.scrapedAt).getTime()
      return dateB - dateA
    })

    // Create aggregated result
    const aggregatedResult = {
      metadata: {
        aggregatedAt: new Date().toISOString(),
        totalScrapedLaws: stats.total,
        successfulLaws: stats.successful,
        errorLaws: stats.withErrors,
        failedLaws: failedLaws.length,
        statistics: stats,
      },
      scrapedLaws,
      failedLaws,
    }

    // Save aggregated result
    await fs.promises.writeFile(
      this.outputPath,
      JSON.stringify(aggregatedResult, null, 2),
      'utf8'
    )

    console.log('\n📊 Aggregation Complete:')
    console.log(`   Total files processed: ${stats.total}`)
    console.log(`   Successfully scraped: ${stats.successful}`)
    console.log(`   With errors: ${stats.withErrors}`)
    console.log(`   Failed completely: ${failedLaws.length}`)
    console.log(`   Average text length: ${stats.averageTextLength} chars`)
    console.log(`   Saved to: ${this.outputPath}`)

    return aggregatedResult
  }

  async generateReport() {
    const result = await this.aggregate()
    const report = this.createTextReport(result)

    const reportPath = this.outputPath.replace('.json', '_report.txt')
    await fs.promises.writeFile(reportPath, report, 'utf8')

    console.log(`📄 Report saved to: ${reportPath}`)
    return report
  }

  createTextReport(result) {
    const { metadata, failedLaws } = result
    const stats = metadata.statistics

    return `
BULGARIAN LAWS SCRAPING REPORT
===============================

Generated: ${metadata.aggregatedAt}

SUMMARY
-------
Total Laws Processed: ${metadata.totalScrapedLaws}
Successfully Scraped: ${metadata.successfulLaws}
With Errors: ${metadata.errorLaws}
Completely Failed: ${metadata.failedLaws}

TEXT STATISTICS  
---------------
Total Text Length: ${stats.totalTextLength.toLocaleString()} characters
Average Text Length: ${stats.averageTextLength.toLocaleString()} characters
Minimum Text Length: ${stats.minTextLength.toLocaleString()} characters
Maximum Text Length: ${stats.maxTextLength.toLocaleString()} characters

SUCCESS RATE
-----------
Overall Success Rate: ${(
      (metadata.successfulLaws /
        (metadata.totalScrapedLaws + metadata.failedLaws)) *
      100
    ).toFixed(2)}%
Completion Rate: ${(
      (metadata.successfulLaws / metadata.totalScrapedLaws) *
      100
    ).toFixed(2)}%

${
  failedLaws.length > 0
    ? `
FAILED LAWS BREAKDOWN
--------------------
${failedLaws.map((f) => `- ${f.lawId}: ${f.title} (${f.error})`).join('\\n')}
`
    : ''
}

END OF REPORT
`
  }
}

// CLI usage
if (require.main === module) {
  const aggregator = new ResultAggregator()

  const command = process.argv[2] || 'aggregate'

  if (command === 'report') {
    aggregator.generateReport().catch(console.error)
  } else {
    aggregator.aggregate().catch(console.error)
  }
}

module.exports = ResultAggregator
