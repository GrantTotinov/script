#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

class ScrapingProgressMonitor {
  constructor() {
    this.scrapedDir = './scraped_laws'
    this.enhancedDir = './scraped_laws_enhanced'
  }

  getDirectoryStats(dirPath) {
    if (!fs.existsSync(dirPath)) {
      return { count: 0, totalSize: 0, files: [] }
    }

    const files = fs
      .readdirSync(dirPath)
      .filter((f) => f.endsWith('.json') && !f.includes('summary'))

    const stats = {
      count: files.length,
      totalSize: 0,
      files: [],
    }

    files.forEach((file) => {
      const filePath = path.join(dirPath, file)
      const fileStats = fs.statSync(filePath)
      stats.totalSize += fileStats.size
      stats.files.push({
        name: file,
        size: fileStats.size,
        lawId: file.replace('.json', ''),
      })
    })

    return stats
  }

  compareLawVersions() {
    const original = this.getDirectoryStats(this.scrapedDir)
    const enhanced = this.getDirectoryStats(this.enhancedDir)

    const comparison = {
      originalOnly: [],
      enhancedOnly: [],
      improved: [],
      degraded: [],
    }

    // Create maps for easier comparison
    const originalMap = new Map()
    original.files.forEach((file) => {
      originalMap.set(file.lawId, file)
    })

    const enhancedMap = new Map()
    enhanced.files.forEach((file) => {
      enhancedMap.set(file.lawId, file)
    })

    // Find laws only in original
    original.files.forEach((file) => {
      if (!enhancedMap.has(file.lawId)) {
        comparison.originalOnly.push(file.lawId)
      }
    })

    // Find laws only in enhanced
    enhanced.files.forEach((file) => {
      if (!originalMap.has(file.lawId)) {
        comparison.enhancedOnly.push(file.lawId)
      }
    })

    // Compare common laws
    enhanced.files.forEach((file) => {
      const original = originalMap.get(file.lawId)
      if (original) {
        const improvement = ((file.size - original.size) / original.size) * 100
        if (improvement > 10) {
          // At least 10% improvement
          comparison.improved.push({
            lawId: file.lawId,
            originalSize: original.size,
            enhancedSize: file.size,
            improvement: improvement.toFixed(1) + '%',
          })
        } else if (improvement < -10) {
          // Degraded by more than 10%
          comparison.degraded.push({
            lawId: file.lawId,
            originalSize: original.size,
            enhancedSize: file.size,
            degradation: improvement.toFixed(1) + '%',
          })
        }
      }
    })

    return {
      original,
      enhanced,
      comparison,
    }
  }

  generateProgressReport() {
    console.log('\n' + '='.repeat(80))
    console.log('📊 SCRAPING PROGRESS MONITOR')
    console.log('='.repeat(80))

    const stats = this.compareLawVersions()

    console.log(`\n📁 DIRECTORY OVERVIEW:`)
    console.log(
      `   Original laws: ${stats.original.count} files (${(
        stats.original.totalSize /
        1024 /
        1024
      ).toFixed(2)} MB)`
    )
    console.log(
      `   Enhanced laws: ${stats.enhanced.count} files (${(
        stats.enhanced.totalSize /
        1024 /
        1024
      ).toFixed(2)} MB)`
    )

    console.log(`\n🔄 COMPARISON:`)
    console.log(`   Only in original: ${stats.comparison.originalOnly.length}`)
    console.log(`   Only in enhanced: ${stats.comparison.enhancedOnly.length}`)
    console.log(`   Improved laws: ${stats.comparison.improved.length}`)
    console.log(`   Degraded laws: ${stats.comparison.degraded.length}`)

    if (stats.comparison.improved.length > 0) {
      console.log(`\n✅ TOP 10 IMPROVEMENTS:`)
      stats.comparison.improved
        .sort((a, b) => parseFloat(b.improvement) - parseFloat(a.improvement))
        .slice(0, 10)
        .forEach((law, i) => {
          console.log(
            `   ${i + 1}. ${law.lawId}: ${(law.originalSize / 1024).toFixed(
              1
            )}KB → ${(law.enhancedSize / 1024).toFixed(1)}KB (+${
              law.improvement
            })`
          )
        })
    }

    if (stats.comparison.degraded.length > 0) {
      console.log(`\n⚠️  DEGRADED LAWS:`)
      stats.comparison.degraded.forEach((law, i) => {
        console.log(
          `   ${i + 1}. ${law.lawId}: ${(law.originalSize / 1024).toFixed(
            1
          )}KB → ${(law.enhancedSize / 1024).toFixed(1)}KB (${law.degradation})`
        )
      })
    }

    // Check if enhanced scraping is still running
    const summaryPath = path.join(
      this.enhancedDir,
      'enhanced_scraping_summary.json'
    )
    if (fs.existsSync(summaryPath)) {
      try {
        const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'))
        console.log(`\n📈 LAST ENHANCED SCRAPING SESSION:`)
        console.log(`   Successful: ${summary.successful}/${summary.total}`)
        console.log(`   Failed: ${summary.failed}/${summary.total}`)
        console.log(
          `   Success Rate: ${Math.round(
            (summary.successful / summary.total) * 100
          )}%`
        )

        if (summary.errors && summary.errors.length > 0) {
          console.log(`\n❌ Recent failures:`)
          summary.errors.slice(0, 5).forEach((error) => {
            console.log(`   - ${error.lawId}: ${error.error}`)
          })
        }
      } catch (error) {
        console.log('   Could not read summary file')
      }
    }

    return stats
  }

  checkCurrentProgress() {
    // Check if there's an active enhanced scraping process
    const enhancedFiles = this.getDirectoryStats(this.enhancedDir)

    // Load batch file to see expected count
    try {
      const batchFile = './enhanced_batch_1.json'
      if (fs.existsSync(batchFile)) {
        const expectedLaws = JSON.parse(fs.readFileSync(batchFile, 'utf8'))
        const progress = (
          (enhancedFiles.count / expectedLaws.length) *
          100
        ).toFixed(1)

        console.log(`\n⏳ CURRENT BATCH PROGRESS:`)
        console.log(
          `   Processed: ${enhancedFiles.count}/${expectedLaws.length} (${progress}%)`
        )
        console.log(
          `   Remaining: ${expectedLaws.length - enhancedFiles.count}`
        )

        return {
          processed: enhancedFiles.count,
          total: expectedLaws.length,
          remaining: expectedLaws.length - enhancedFiles.count,
          progress: parseFloat(progress),
        }
      }
    } catch (error) {
      console.log('   Could not determine batch progress')
    }

    return null
  }
}

// CLI interface
if (require.main === module) {
  const monitor = new ScrapingProgressMonitor()
  const stats = monitor.generateProgressReport()
  const progress = monitor.checkCurrentProgress()

  console.log('\n' + '='.repeat(80))
  console.log('Monitor completed. Re-run to check progress again.')
  console.log('='.repeat(80))
}

module.exports = ScrapingProgressMonitor
