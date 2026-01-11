#!/usr/bin/env node

/**
 * Example Usage Script for Bulgarian Laws Scraper
 *
 * This script demonstrates how to use the scraper system
 * with different configurations and scenarios.
 */

import BulgarianLawsScraper from './law-scraper.js'
import BatchProcessor from './batch-processor.js'
import ResultAggregator from './result-aggregator.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// Example configurations for different scenarios
const SCENARIOS = {
  // Quick test with just a few laws
  quick_test: {
    batchSize: 5,
    maxRetries: 2,
    concurrency: 1,
    delayBetweenRequests: 1000,
    headless: false, // Visual browser for debugging
  },

  // Production settings for local full scraping
  production_local: {
    batchSize: 50,
    maxRetries: 3,
    concurrency: 3,
    delayBetweenRequests: 2000,
    headless: true,
  },

  // Conservative settings for slow/unstable networks
  conservative: {
    batchSize: 20,
    maxRetries: 5,
    concurrency: 1,
    delayBetweenRequests: 5000,
    pageTimeout: 120000,
    navigationTimeout: 60000,
    headless: true,
  },

  // Aggressive settings for fast networks
  aggressive: {
    batchSize: 200,
    maxRetries: 2,
    concurrency: 5,
    delayBetweenRequests: 1000,
    pageTimeout: 30000,
    navigationTimeout: 15000,
    headless: true,
  },
}

async function runExample() {
  console.log('🎯 Bulgarian Laws Scraper - Example Usage\n')

  // Get scenario from command line or default to quick_test
  const scenarioName = process.argv[2] || 'quick_test'
  const scenario = SCENARIOS[scenarioName]

  if (!scenario) {
    console.error(`❌ Unknown scenario: ${scenarioName}`)
    console.log('Available scenarios:', Object.keys(SCENARIOS).join(', '))
    process.exit(1)
  }

  console.log(`📋 Using scenario: ${scenarioName}`)
  console.log(`⚙️  Configuration:`, JSON.stringify(scenario, null, 2))

  try {
    // Step 1: Load sample laws for testing
    console.log('\n📚 Step 1: Loading sample laws...')
    const sampleLaws = await loadSampleLaws(scenario.batchSize)
    console.log(`Loaded ${sampleLaws.length} sample laws`)

    // Step 2: Create batch processor
    console.log('\n🔄 Step 2: Creating batches...')
    const processor = new BatchProcessor({
      ...scenario,
      outputDir: './example_batches',
    })

    // For example, we'll create a small batch manually instead of from file
    const batchData = {
      batchIndex: 0,
      totalBatches: 1,
      laws: sampleLaws,
      createdAt: new Date().toISOString(),
    }

    console.log(`Created example batch with ${sampleLaws.length} laws`)

    // Step 3: Initialize scraper
    console.log('\n🤖 Step 3: Initializing scraper...')
    const scraper = new BulgarianLawsScraper({
      ...scenario,
      outputDir: './example_scraped_laws',
    })

    // Step 4: Run scraping
    console.log('\n🚀 Step 4: Starting scraping process...')
    const startTime = Date.now()

    const result = await scraper.scrapeLawsBatch(sampleLaws, 'example_batch')

    const duration = Date.now() - startTime
    console.log('\n✅ Scraping completed!')
    console.log(`📊 Results:`, {
      ...result,
      durationSeconds: Math.round(duration / 1000),
    })

    // Step 5: Demonstrate aggregation
    if (result.successful > 0) {
      console.log('\n📈 Step 5: Aggregating results...')
      const aggregator = new ResultAggregator({
        scrapedDir: './example_scraped_laws',
      })

      const aggregatedResults = await aggregator.aggregate()
      console.log('Aggregation completed:', aggregatedResults.metadata)
    }

    // Step 6: Show examples of scraped content
    console.log('\n📄 Step 6: Sample scraped content...')
    await showSampleContent('./example_scraped_laws')
  } catch (error) {
    console.error('\n❌ Example failed:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

/**
 * Load sample laws for testing
 */
async function loadSampleLaws(count = 5) {
  const inputPath = path.join(__dirname, 'public', 'all_laws.json')

  if (!fs.existsSync(inputPath)) {
    console.log('⚠️  No laws file found, creating mock data...')
    return createMockLaws(count)
  }

  const content = await fs.promises.readFile(inputPath, 'utf8')
  const allLaws = JSON.parse(content)

  // Take first N laws for testing
  return allLaws.slice(0, Math.min(count, allLaws.length))
}

/**
 * Create mock laws for testing when no real data is available
 */
function createMockLaws(count) {
  const mockLaws = []

  for (let i = 0; i < count; i++) {
    mockLaws.push({
      title: `Mock Law ${i + 1}/01/2025 Test Law for Scraper`,
      date: '2025-01-01',
      link: `https://www.parliament.bg/bg/laws/ID/16${String(5900 + i).padStart(
        4,
        '0'
      )}`,
    })
  }

  console.log('⚠️  Using mock laws - results may not be realistic')
  return mockLaws
}

/**
 * Show sample content from scraped laws
 */
async function showSampleContent(scrapedDir) {
  if (!fs.existsSync(scrapedDir)) {
    console.log('No scraped content found')
    return
  }

  const files = await fs.promises.readdir(scrapedDir)
  const jsonFiles = files.filter((f) => f.endsWith('.json'))

  if (jsonFiles.length === 0) {
    console.log('No scraped law files found')
    return
  }

  // Show first file as example
  const sampleFile = jsonFiles[0]
  const samplePath = path.join(scrapedDir, sampleFile)
  const content = await fs.promises.readFile(samplePath, 'utf8')
  const law = JSON.parse(content)

  console.log(`Sample law (${sampleFile}):`)
  console.log(`  Title: ${law.actualTitle || law.title}`)
  console.log(`  Law ID: ${law.lawId}`)
  console.log(`  Text Length: ${law.textLength} characters`)
  console.log(`  Scraped At: ${law.scrapedAt}`)
  console.log(`  Is Complete: ${law.isComplete}`)

  if (law.fullText && law.fullText.length > 0) {
    const preview = law.fullText.substring(0, 200) + '...'
    console.log(`  Preview: ${preview}`)
  }

  if (law.metadata && law.metadata.length > 0) {
    console.log(`  Metadata: ${law.metadata.slice(0, 2).join('; ')}`)
  }
}

/**
 * Cleanup example files
 */
async function cleanup() {
  const dirs = ['./example_batches', './example_scraped_laws']

  for (const dir of dirs) {
    if (fs.existsSync(dir)) {
      const files = await fs.promises.readdir(dir)
      for (const file of files) {
        await fs.promises.unlink(path.join(dir, file))
      }
      await fs.promises.rmdir(dir)
      console.log(`🧹 Cleaned up: ${dir}`)
    }
  }
}

// Show help
function showHelp() {
  console.log(`
🎯 Bulgarian Laws Scraper - Example Usage

Usage: node example.js [scenario]

Available scenarios:
${Object.entries(SCENARIOS)
  .map(
    ([name, config]) =>
      `  ${name.padEnd(20)} - ${getScenarioDescription(name, config)}`
  )
  .join('\n')}

Examples:
  node example.js quick_test     # Quick test with visual browser
  node example.js production_local # Full local production run
  node example.js conservative   # Safe settings for slow networks
  node example.js aggressive     # Fast settings for good networks

Special commands:
  node example.js cleanup        # Clean up example files
  node example.js help          # Show this help
  `)
}

function getScenarioDescription(name, config) {
  const descriptions = {
    quick_test: `${config.batchSize} laws, visual browser, fast for debugging`,
    production_local: `${config.batchSize} laws per batch, balanced settings`,
    conservative: `${config.batchSize} laws per batch, slow & safe`,
    aggressive: `${config.batchSize} laws per batch, fast & efficient`,
  }
  return descriptions[name] || 'Custom configuration'
}

// CLI handling
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2]

  if (command === 'help' || command === '--help' || command === '-h') {
    showHelp()
  } else if (command === 'cleanup') {
    cleanup().then(() => console.log('✅ Cleanup completed'))
  } else {
    runExample().catch((error) => {
      console.error('❌ Example failed:', error.message)
      process.exit(1)
    })
  }
}

module.exports = {
  runExample,
  loadSampleLaws,
  createMockLaws,
  showSampleContent,
  cleanup,
  SCENARIOS,
}
