#!/usr/bin/env node

/**
 * Command Line Interface for Bulgarian Laws Scraper
 *
 * This script provides a unified interface for:
 * - Creating batches from the laws dataset
 * - Running scrapers on specific batches
 * - Resume capabilities and progress tracking
 */

import BulgarianLawsScraper from './law-scraper.js'
import BatchProcessor from './batch-processor.js'
import ResultAggregator from './result-aggregator.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { pathToFileURL } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Parse command line arguments
const args = process.argv.slice(2)
const command = args[0]

// Default configuration
const config = {
  batchSize: parseInt(process.env.BATCH_SIZE) || 100,
  maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
  concurrency: parseInt(process.env.CONCURRENCY) || 3,
  delayBetweenRequests: parseInt(process.env.DELAY_MS) || 2000,
  headless: process.env.HEADLESS !== 'false',

  // Paths
  inputPath:
    process.env.INPUT_PATH || path.join(__dirname, 'public', 'all_laws.json'),
  outputDir: process.env.OUTPUT_DIR || path.join(__dirname, 'scraped_laws'),
  batchDir: process.env.BATCH_DIR || path.join(__dirname, 'batches'),

  // GitHub Actions integration
  batchIndex: parseInt(process.env.BATCH_INDEX) || parseInt(args[1]) || 0,
  totalBatches: parseInt(process.env.TOTAL_BATCHES) || parseInt(args[2]) || 1,
}

/**
 * Main CLI handler
 */
async function main() {
  try {
    switch (command) {
      case 'create-batches':
        await createBatches()
        break

      case 'scrape-batch':
        await scrapeBatch()
        break

      case 'scrape-all':
        await scrapeAll()
        break

      case 'resume':
        await resumeScraping()
        break

      case 'status':
        await showStatus()
        break

      case 'cleanup':
        await cleanup()
        break

      case 'aggregate-results':
        await aggregateResults()
        break

      case 'help':
      case '--help':
      case '-h':
        showHelp()
        break

      default:
        console.error(`Unknown command: ${command}`)
        showHelp()
        process.exit(1)
    }
  } catch (error) {
    console.error(`Error: ${error.message}`)
    console.error(error.stack)
    process.exit(1)
  }
}

/**
 * Create batches from the laws dataset
 */
async function createBatches() {
  console.log('Creating batches from laws dataset...')

  const processor = new BatchProcessor({
    batchSize: config.batchSize,
    inputPath: config.inputPath,
    outputDir: config.batchDir,
    strategy: process.env.BATCH_STRATEGY || 'size',
  })

  const result = await processor.createBatches()

  console.log('✅ Batches created successfully:')
  console.log(`   Total laws: ${result.totalLaws}`)
  console.log(`   Total batches: ${result.totalBatches}`)
  console.log(`   Strategy: ${result.strategy}`)
  console.log(`   Batch size: ${config.batchSize}`)

  // Generate GitHub Actions matrix
  const indices = await processor.getBatchIndicesForMatrix()
  console.log('\\n📋 GitHub Actions matrix indices:')
  console.log(JSON.stringify(indices))

  // Save matrix to file for easy access (formatted for readability)
  const matrixPath = path.join(__dirname, 'github-matrix.json')
  const matrixData = { batch: indices }

  // For GitHub Actions compatibility, save as compact JSON (single line)
  // This ensures it works with both old and new workflow versions
  await fs.promises.writeFile(matrixPath, JSON.stringify(matrixData))

  // Also save formatted version for local use/readability
  const formattedMatrixPath = path.join(
    __dirname,
    'github-matrix-formatted.json'
  )
  await fs.promises.writeFile(
    formattedMatrixPath,
    JSON.stringify(matrixData, null, 2)
  )

  // Also save compact version for GitHub Actions (explicit name)
  const compactMatrixPath = path.join(__dirname, 'github-matrix-compact.json')
  await fs.promises.writeFile(compactMatrixPath, JSON.stringify(matrixData))

  console.log(
    `\\n💾 Matrix saved to: ${matrixPath} (compact for GitHub Actions)`
  )
  console.log(`💾 Formatted matrix saved to: ${formattedMatrixPath}`)
  console.log(`💾 Compact matrix saved to: ${compactMatrixPath}`)
}

/**
 * Scrape a specific batch
 */
async function scrapeBatch() {
  const batchIndex = config.batchIndex
  console.log(`Scraping batch ${batchIndex}...`)

  // Load batch data
  const processor = new BatchProcessor({
    outputDir: config.batchDir,
  })

  const batchData = await processor.getBatchData(batchIndex)
  console.log(`Loaded batch ${batchIndex}: ${batchData.laws.length} laws`)

  // Initialize scraper
  const scraper = new BulgarianLawsScraper({
    headless: config.headless,
    maxRetries: config.maxRetries,
    concurrency: config.concurrency,
    delayBetweenRequests: config.delayBetweenRequests,
    outputDir: config.outputDir,
  })

  // Run scraper
  const result = await scraper.scrapeLawsBatch(
    batchData.laws,
    `batch_${batchIndex}`
  )

  console.log('\\n✅ Batch scraping completed:')
  console.log(`   Batch: ${result.batchId}`)
  console.log(`   Total: ${result.total}`)
  console.log(`   Successful: ${result.successful}`)
  console.log(`   Failed: ${result.failed}`)
  console.log(`   Skipped: ${result.skipped}`)
  console.log(`   Duration: ${Math.round(result.duration / 1000)}s`)

  // Save progress for GitHub Actions aggregation
  const progressData = {
    batchIndex: batchIndex,
    successful: result.successful,
    failed: result.failed,
    skipped: result.skipped,
    duration: result.duration,
    total: result.total,
    timestamp: new Date().toISOString(),
  }

  await fs.promises.writeFile(
    path.join(__dirname, 'scraping_progress.json'),
    JSON.stringify(progressData, null, 2)
  )

  // Set GitHub Actions outputs using modern syntax
  if (process.env.GITHUB_ACTIONS) {
    const outputFile = process.env.GITHUB_OUTPUT
    if (outputFile) {
      const outputs = [
        `successful=${result.successful}`,
        `failed=${result.failed}`,
        `skipped=${result.skipped}`,
        `processed=${result.total}`,
        `duration=${result.duration}`,
      ]
      await fs.promises.appendFile(outputFile, outputs.join('\n') + '\n')
    }
  }
}

/**
 * Scrape all batches sequentially (for local testing)
 */
async function scrapeAll() {
  console.log('Scraping all batches sequentially...')

  const processor = new BatchProcessor({
    outputDir: config.batchDir,
  })

  const batchConfig = await processor.loadBatchConfiguration()
  if (!batchConfig) {
    throw new Error('No batch configuration found. Run "create-batches" first.')
  }

  const scraper = new BulgarianLawsScraper({
    headless: config.headless,
    maxRetries: config.maxRetries,
    concurrency: config.concurrency,
    delayBetweenRequests: config.delayBetweenRequests,
    outputDir: config.outputDir,
  })

  let totalStats = { successful: 0, failed: 0, skipped: 0, duration: 0 }

  for (const batch of batchConfig.batches) {
    console.log(
      `\\n📦 Processing batch ${batch.batchIndex}/${
        batchConfig.totalBatches - 1
      }...`
    )

    const batchData = await processor.getBatchData(batch.batchIndex)
    const result = await scraper.scrapeLawsBatch(
      batchData.laws,
      `batch_${batch.batchIndex}`
    )

    totalStats.successful += result.successful
    totalStats.failed += result.failed
    totalStats.skipped += result.skipped
    totalStats.duration += result.duration

    console.log(
      `   ✓ Batch ${batch.batchIndex}: ${result.successful} successful, ${result.failed} failed`
    )
  }

  console.log('\\n🎉 All batches completed:')
  console.log(`   Total successful: ${totalStats.successful}`)
  console.log(`   Total failed: ${totalStats.failed}`)
  console.log(`   Total skipped: ${totalStats.skipped}`)
  console.log(`   Total duration: ${Math.round(totalStats.duration / 1000)}s`)
}

/**
 * Resume scraping from where it left off
 */
async function resumeScraping() {
  console.log('Resuming scraping from previous session...')

  // Find incomplete batches by checking scraped files
  const processor = new BatchProcessor({
    outputDir: config.batchDir,
  })

  const batchConfig = await processor.loadBatchConfiguration()
  if (!batchConfig) {
    throw new Error('No batch configuration found. Run "create-batches" first.')
  }

  // Check which laws are already scraped
  const scrapedFiles = fs.existsSync(config.outputDir)
    ? await fs.promises.readdir(config.outputDir)
    : []

  const scrapedLawIds = new Set(
    scrapedFiles
      .filter((f) => f.endsWith('.json'))
      .map((f) => path.basename(f, '.json'))
  )

  console.log(`Found ${scrapedLawIds.size} already scraped laws`)

  // Find incomplete batches
  const incompleteBatches = []
  const { extractLawId } = await import('./schemas.js')

  for (const batch of batchConfig.batches) {
    const batchData = await processor.getBatchData(batch.batchIndex)
    const unscrapedLaws = batchData.laws.filter((law) => {
      const lawId = extractLawId(law.link)
      return !scrapedLawIds.has(lawId)
    })

    if (unscrapedLaws.length > 0) {
      incompleteBatches.push({
        ...batch,
        unscrapedLaws,
        remainingCount: unscrapedLaws.length,
      })
    }
  }

  if (incompleteBatches.length === 0) {
    console.log('✅ All batches are already complete!')
    return
  }

  console.log(`Found ${incompleteBatches.length} incomplete batches`)

  // Resume scraping incomplete batches
  const scraper = new BulgarianLawsScraper({
    headless: config.headless,
    maxRetries: config.maxRetries,
    concurrency: config.concurrency,
    delayBetweenRequests: config.delayBetweenRequests,
    outputDir: config.outputDir,
  })

  for (const batch of incompleteBatches) {
    console.log(
      `\\n🔄 Resuming batch ${batch.batchIndex} (${batch.remainingCount} laws remaining)...`
    )

    const result = await scraper.scrapeLawsBatch(
      batch.unscrapedLaws,
      `resume_batch_${batch.batchIndex}`
    )
    console.log(
      `   ✓ Completed: ${result.successful} successful, ${result.failed} failed`
    )
  }

  console.log('\\n🎉 Resume completed!')
}

/**
 * Show scraping status
 */
async function showStatus() {
  console.log('📊 Scraping Status Report\\n')

  // Load batch configuration
  const processor = new BatchProcessor({
    outputDir: config.batchDir,
  })

  const batchConfig = await processor.loadBatchConfiguration()
  if (!batchConfig) {
    console.log('❌ No batch configuration found. Run "create-batches" first.')
    return
  }

  // Count scraped files
  const scrapedFiles = fs.existsSync(config.outputDir)
    ? await fs.promises.readdir(config.outputDir)
    : []

  const scrapedCount = scrapedFiles.filter((f) => f.endsWith('.json')).length

  // Load failed laws
  const failedLogPath = path.join(__dirname, 'failed_laws.json')
  let failedCount = 0
  if (fs.existsSync(failedLogPath)) {
    const failedContent = await fs.promises.readFile(failedLogPath, 'utf8')
    const failedLaws = JSON.parse(failedContent)
    failedCount = failedLaws.length
  }

  // Calculate statistics
  const totalLaws = batchConfig.totalLaws
  const completionRate = ((scrapedCount / totalLaws) * 100).toFixed(2)
  const remainingLaws = totalLaws - scrapedCount - failedCount

  console.log(`📋 Total laws in dataset: ${totalLaws}`)
  console.log(`✅ Successfully scraped: ${scrapedCount} (${completionRate}%)`)
  console.log(`❌ Failed to scrape: ${failedCount}`)
  console.log(`⏳ Remaining to scrape: ${remainingLaws}`)
  console.log(`📦 Total batches: ${batchConfig.totalBatches}`)
  console.log(`🔧 Strategy used: ${batchConfig.strategy}`)
  console.log(
    `📅 Batches created: ${new Date(batchConfig.createdAt).toLocaleString()}`
  )

  // Batch-level status
  console.log('\\n📦 Batch Status:')
  const { extractLawId } = await import('./schemas.js')

  for (const batch of batchConfig.batches.slice(0, 10)) {
    // Show first 10 batches
    const batchData = await processor.getBatchData(batch.batchIndex)
    let batchScraped = 0
    for (const law of batchData.laws) {
      const lawId = extractLawId(law.link)
      const filePath = path.join(config.outputDir, `${lawId}.json`)
      if (fs.existsSync(filePath)) {
        batchScraped++
      }
    }

    const batchCompletion = ((batchScraped / batch.size) * 100).toFixed(1)
    console.log(
      `   Batch ${batch.batchIndex}: ${batchScraped}/${batch.size} (${batchCompletion}%)`
    )
  }

  if (batchConfig.batches.length > 10) {
    console.log(`   ... and ${batchConfig.batches.length - 10} more batches`)
  }
}

/**
 * Cleanup batch files and temporary data
 */
async function cleanup() {
  console.log('🧹 Cleaning up batch files and temporary data...')

  const processor = new BatchProcessor({
    outputDir: config.batchDir,
  })

  await processor.cleanupBatchFiles()

  // Clean up other temporary files
  const tempFiles = [
    'github-matrix.json',
    'failed_laws.json',
    'scraping_progress.json',
  ]

  for (const file of tempFiles) {
    const filePath = path.join(__dirname, file)
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath)
      console.log(`Deleted: ${file}`)
    }
  }

  console.log('✅ Cleanup completed')
}

/**
 * Aggregate scraped results into a single file
 */
async function aggregateResults() {
  console.log('Aggregating scraped results...')

  const aggregator = new ResultAggregator({
    scrapedDir: config.outputDir,
    outputPath: path.join(__dirname, 'aggregated_results.json'),
    failedLogPath: path.join(__dirname, 'failed_laws.json'),
  })

  const result = await aggregator.aggregate()

  console.log('\n📋 Results Summary:')
  console.log(`   Total scraped files: ${result.metadata.totalScrapedLaws}`)
  console.log(`   Successful: ${result.metadata.successfulLaws}`)
  console.log(`   With errors: ${result.metadata.errorLaws}`)
  console.log(`   Failed: ${result.metadata.failedLaws}`)
  console.log(
    `   Success rate: ${(
      (result.metadata.successfulLaws /
        (result.metadata.totalScrapedLaws + result.metadata.failedLaws)) *
      100
    ).toFixed(2)}%`
  )

  // Generate report as well
  await aggregator.generateReport()
}

/**
 * Show help information
 */
function showHelp() {
  console.log(`
Bulgarian Laws Scraper CLI

Usage:
  node scraper-cli.js <command> [options]

Commands:
  create-batches    Create batches from the laws dataset
  scrape-batch      Scrape a specific batch (for GitHub Actions)
  scrape-all        Scrape all batches sequentially (for local testing)
  resume            Resume scraping from previous session
  status            Show current scraping status
  cleanup           Clean up batch files and temporary data
  aggregate-results Aggregate all scraped results into single file
  help              Show this help message

Examples:
  # Create batches
  node scraper-cli.js create-batches

  # Scrape batch 0 (for GitHub Actions)
  node scraper-cli.js scrape-batch 0

  # Scrape all batches locally
  node scraper-cli.js scrape-all

  # Resume interrupted scraping
  node scraper-cli.js resume

  # Check progress
  node scraper-cli.js status

  # Aggregate all results
  node scraper-cli.js aggregate-results

Environment Variables:
  BATCH_SIZE=100               Number of laws per batch
  MAX_RETRIES=3               Maximum retry attempts per law
  CONCURRENCY=3               Number of concurrent browsers
  DELAY_MS=2000               Delay between requests (ms)
  HEADLESS=true               Run browsers in headless mode
  INPUT_PATH=./public/all_laws.json    Input laws file
  OUTPUT_DIR=./scraped_laws           Output directory
  BATCH_DIR=./batches                 Batch files directory

GitHub Actions Integration:
  BATCH_INDEX=0               Current batch index (from matrix)
  TOTAL_BATCHES=10           Total number of batches
  `)
}

// Run CLI
const isMainModule = import.meta.url === pathToFileURL(process.argv[1]).href
if (isMainModule) {
  main().catch((error) => {
    console.error(`Fatal error: ${error.message}`)
    process.exit(1)
  })
}

export {
  createBatches,
  scrapeBatch,
  scrapeAll,
  resumeScraping,
  showStatus,
  cleanup,
  aggregateResults,
}
