const fs = require('fs')
const { spawn } = require('child_process')
const path = require('path')

class ContinuousMonitor {
  constructor() {
    this.checkInterval = 30000 // Check every 30 seconds
    this.isMonitoring = false
    this.stats = {
      startTime: Date.now(),
      totalProcessed: 0,
      currentBatch: null,
      estimatedCompletion: null,
    }
  }

  async startMonitoring() {
    this.isMonitoring = true
    console.log('🔍 Starting continuous monitoring...')
    console.log('Press Ctrl+C to stop monitoring\n')

    while (this.isMonitoring) {
      await this.checkProgress()
      await this.sleep(this.checkInterval)
    }
  }

  async checkProgress() {
    const timestamp = new Date().toLocaleString()
    console.log(`\n⏰ ${timestamp}`)
    console.log('-'.repeat(50))

    try {
      // Check current enhanced directory
      const enhancedDir = './scraped_laws_enhanced'
      if (fs.existsSync(enhancedDir)) {
        const files = fs
          .readdirSync(enhancedDir)
          .filter((f) => f.endsWith('.json') && !f.includes('summary'))
        const newProcessed = files.length
        const processedSinceStart = newProcessed - this.stats.totalProcessed

        if (processedSinceStart > 0) {
          console.log(
            `📈 Progress: ${newProcessed} total laws processed (+${processedSinceStart} since last check)`
          )
        } else {
          console.log(`📊 Status: ${newProcessed} laws processed (no change)`)
        }

        this.stats.totalProcessed = newProcessed
      }

      // Check if automation progress file exists
      if (fs.existsSync('./automation_progress.json')) {
        const progress = JSON.parse(
          fs.readFileSync('./automation_progress.json', 'utf8')
        )
        console.log(
          `🔄 Batch Progress: ${progress.completedBatches}/${progress.totalBatches} batches`
        )
        console.log(
          `✅ Success Rate: ${Math.round(
            (progress.successfulLaws /
              (progress.successfulLaws + progress.failedLaws)) *
              100
          )}%`
        )
      }

      // Check for active processes
      this.checkActiveProcesses()

      // Estimate completion time
      this.estimateCompletion()
    } catch (error) {
      console.log('⚠️  Error checking progress:', error.message)
    }
  }

  checkActiveProcesses() {
    // Check if there are any node processes running our scripts
    try {
      const { execSync } = require('child_process')
      const processes = execSync(
        'tasklist /FI "IMAGENAME eq node.exe" /FO CSV',
        { encoding: 'utf8' }
      )
      const nodeProcesses =
        processes.split('\n').filter((line) => line.includes('node.exe'))
          .length - 1

      if (nodeProcesses > 1) {
        // More than just this monitor process
        console.log(
          `🔄 Active processes: ${
            nodeProcesses - 1
          } enhanced scraping processes running`
        )
      } else {
        console.log(`💤 No active scraping processes detected`)
      }
    } catch (error) {
      // Ignore errors from process checking
    }
  }

  estimateCompletion() {
    const elapsed = Date.now() - this.stats.startTime
    const elapsedMinutes = elapsed / 60000

    if (this.stats.totalProcessed > 0 && elapsedMinutes > 0) {
      const ratePerMinute = this.stats.totalProcessed / elapsedMinutes

      // Estimate remaining laws (rough estimate)
      const estimatedRemaining = Math.max(0, 1964 - this.stats.totalProcessed)
      const estimatedMinutesLeft = estimatedRemaining / ratePerMinute

      console.log(
        `⏱️  Estimated completion: ${Math.round(
          estimatedMinutesLeft
        )} minutes (${ratePerMinute.toFixed(1)} laws/min)`
      )
    }
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  stop() {
    this.isMonitoring = false
    console.log('\n🛑 Monitoring stopped')
  }
}

// Quick status check function
function quickStatus() {
  console.log('📊 QUICK STATUS CHECK')
  console.log('='.repeat(50))

  // Current enhanced laws
  const enhancedDir = './scraped_laws_enhanced'
  if (fs.existsSync(enhancedDir)) {
    const files = fs
      .readdirSync(enhancedDir)
      .filter((f) => f.endsWith('.json') && !f.includes('summary'))
    console.log(`✅ Enhanced laws: ${files.length}`)

    // Check latest file for recency
    if (files.length > 0) {
      const latestFile = files
        .map((f) => ({
          name: f,
          time: fs.statSync(path.join(enhancedDir, f)).mtime,
        }))
        .sort((a, b) => b.time - a.time)[0]

      const minutesAgo = (Date.now() - latestFile.time.getTime()) / 60000
      console.log(
        `🕐 Latest: ${latestFile.name} (${Math.round(minutesAgo)} minutes ago)`
      )
    }
  }

  // Check automation progress
  if (fs.existsSync('./automation_progress.json')) {
    const progress = JSON.parse(
      fs.readFileSync('./automation_progress.json', 'utf8')
    )
    console.log(
      `🔄 Automation: ${progress.completedBatches}/${progress.totalBatches} batches`
    )
    console.log(
      `📈 Success: ${progress.successfulLaws}/${
        progress.successfulLaws + progress.failedLaws
      } laws`
    )
  }

  // Check current batch progress
  if (fs.existsSync('./enhanced_batch_1_remaining.json')) {
    const remaining = JSON.parse(
      fs.readFileSync('./enhanced_batch_1_remaining.json', 'utf8')
    )
    console.log(`⏳ Current batch remaining: ${remaining.length} laws`)
  }

  console.log('\n💡 Use: node monitor.cjs --continuous for live monitoring')
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2)

  if (args.includes('--continuous') || args.includes('-c')) {
    const monitor = new ContinuousMonitor()

    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
      monitor.stop()
      process.exit(0)
    })

    monitor.startMonitoring()
  } else {
    quickStatus()
  }
}

module.exports = { ContinuousMonitor, quickStatus }
