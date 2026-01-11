/**
 * Batch Processing System for Bulgarian Laws Scraping
 *
 * This module handles:
 * - Splitting laws into batches for parallel processing
 * - Managing batch configurations and metadata
 * - Sorting laws chronologically (newest first)
 * - Creating batch files for GitHub Actions matrix processing
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { extractLawId, validateInputLaw } from './schemas.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

class BatchProcessor {
  constructor(options = {}) {
    this.options = {
      batchSize: options.batchSize || 100, // Laws per batch
      outputDir: options.outputDir || path.join(__dirname, 'batches'),
      sortOrder: options.sortOrder || 'desc', // 'desc' for newest first, 'asc' for oldest first

      // Batch distribution strategies
      strategy: options.strategy || 'size', // 'size' or 'year' or 'equal'

      // File paths
      inputPath:
        options.inputPath || path.join(__dirname, 'public', 'all_laws.json'),
      batchConfigPath:
        options.batchConfigPath || path.join(__dirname, 'batch-config.json'),

      ...options,
    }

    // Ensure output directory exists
    if (!fs.existsSync(this.options.outputDir)) {
      fs.mkdirSync(this.options.outputDir, { recursive: true })
    }
  }

  /**
   * Main method to create batches from all laws
   */
  async createBatches() {
    this.log('Starting batch processing...')

    // Load and validate laws
    const laws = await this.loadAndValidateLaws()
    this.log(`Loaded ${laws.length} valid laws`)

    // Sort laws chronologically
    const sortedLaws = this.sortLawsChronologically(laws)
    this.log(`Sorted laws ${this.options.sortOrder}ending chronologically`)

    // Create batches using selected strategy
    const batches = this.createBatchesByStrategy(sortedLaws)
    this.log(
      `Created ${batches.length} batches using strategy: ${this.options.strategy}`
    )

    // Save batch files
    const batchConfigs = await this.saveBatchFiles(batches)

    // Save batch configuration
    await this.saveBatchConfiguration(batchConfigs, sortedLaws.length)

    this.log(`Batch processing completed: ${batches.length} batches created`)

    return {
      totalLaws: sortedLaws.length,
      totalBatches: batches.length,
      batchConfigs,
      strategy: this.options.strategy,
    }
  }

  /**
   * Load laws and validate them
   */
  async loadAndValidateLaws() {
    if (!fs.existsSync(this.options.inputPath)) {
      throw new Error(`Input file not found: ${this.options.inputPath}`)
    }

    const content = await fs.promises.readFile(this.options.inputPath, 'utf8')
    const allLaws = JSON.parse(content)

    if (!Array.isArray(allLaws)) {
      throw new Error('Input file must contain an array of laws')
    }

    // Validate and filter laws
    const validLaws = allLaws.filter((law, index) => {
      const isValid = validateInputLaw(law)
      if (!isValid) {
        this.log(`Invalid law at index ${index}: ${JSON.stringify(law)}`)
      }
      return isValid
    })

    this.log(`${validLaws.length} valid laws out of ${allLaws.length} total`)
    return validLaws
  }

  /**
   * Sort laws chronologically
   */
  sortLawsChronologically(laws) {
    return laws.sort((a, b) => {
      // Extract dates from titles or use URL ID as fallback
      const dateA = this.extractDateFromLaw(a)
      const dateB = this.extractDateFromLaw(b)

      if (this.options.sortOrder === 'desc') {
        return dateB - dateA // Newest first
      } else {
        return dateA - dateB // Oldest first
      }
    })
  }

  /**
   * Extract date from law for sorting
   */
  extractDateFromLaw(law) {
    // Try to extract date from title (format: DD/MM/YYYY)
    const dateMatch = law.title.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    if (dateMatch) {
      const [, day, month, year] = dateMatch
      return new Date(
        `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      ).getTime()
    }

    // Fallback: use law ID from URL (higher ID = newer law)
    const lawId = extractLawId(law.link)
    return lawId ? parseInt(lawId, 10) : 0
  }

  /**
   * Create batches using the selected strategy
   */
  createBatchesByStrategy(laws) {
    switch (this.options.strategy) {
      case 'year':
        return this.createBatchesByYear(laws)
      case 'equal':
        return this.createEqualSizeBatches(laws)
      case 'size':
      default:
        return this.createBatchesBySize(laws)
    }
  }

  /**
   * Create batches by fixed size
   */
  createBatchesBySize(laws) {
    const batches = []

    for (let i = 0; i < laws.length; i += this.options.batchSize) {
      const batchLaws = laws.slice(i, i + this.options.batchSize)
      batches.push({
        batchIndex: batches.length,
        laws: batchLaws,
        size: batchLaws.length,
        startIndex: i,
        endIndex: Math.min(i + this.options.batchSize, laws.length),
      })
    }

    return batches
  }

  /**
   * Create batches by year grouping
   */
  createBatchesByYear(laws) {
    const yearGroups = new Map()

    // Group laws by year
    laws.forEach((law, index) => {
      const year = this.extractYearFromLaw(law)
      if (!yearGroups.has(year)) {
        yearGroups.set(year, [])
      }
      yearGroups.get(year).push({ law, originalIndex: index })
    })

    // Convert groups to batches
    const batches = []
    const sortedYears = Array.from(yearGroups.keys()).sort((a, b) =>
      this.options.sortOrder === 'desc' ? b - a : a - b
    )

    for (const year of sortedYears) {
      const yearLaws = yearGroups.get(year)

      // If year has too many laws, split into sub-batches
      if (yearLaws.length > this.options.batchSize) {
        for (let i = 0; i < yearLaws.length; i += this.options.batchSize) {
          const subBatch = yearLaws.slice(i, i + this.options.batchSize)
          batches.push({
            batchIndex: batches.length,
            year: year,
            subBatch: Math.floor(i / this.options.batchSize) + 1,
            laws: subBatch.map((item) => item.law),
            size: subBatch.length,
            startIndex: subBatch[0].originalIndex,
            endIndex: subBatch[subBatch.length - 1].originalIndex + 1,
          })
        }
      } else {
        batches.push({
          batchIndex: batches.length,
          year: year,
          laws: yearLaws.map((item) => item.law),
          size: yearLaws.length,
          startIndex: yearLaws[0].originalIndex,
          endIndex: yearLaws[yearLaws.length - 1].originalIndex + 1,
        })
      }
    }

    return batches
  }

  /**
   * Create equal-sized batches (for balanced parallel processing)
   */
  createEqualSizeBatches(laws) {
    const totalWorkers = this.options.totalWorkers || 10
    const batchSize = Math.ceil(laws.length / totalWorkers)

    return this.createBatchesBySize(laws, batchSize)
  }

  /**
   * Extract year from law
   */
  extractYearFromLaw(law) {
    // Try to extract year from title
    const yearMatch = law.title.match(/(\d{4})/)
    if (yearMatch) {
      const year = parseInt(yearMatch[1], 10)
      // Validate reasonable year range
      if (year >= 2016 && year <= 2030) {
        return year
      }
    }

    // Fallback: estimate year from law ID (approximate)
    const lawId = extractLawId(law.link)
    if (lawId) {
      const id = parseInt(lawId, 10)
      // Rough estimation based on ID ranges (adjust as needed)
      if (id >= 166000) return 2025
      if (id >= 165000) return 2024
      if (id >= 164000) return 2023
      if (id >= 163000) return 2022
      if (id >= 162000) return 2021
      if (id >= 161000) return 2020
      if (id >= 160000) return 2019
      if (id >= 159000) return 2018
      if (id >= 158000) return 2017
      return 2016
    }

    return 2025 // Default to current year
  }

  /**
   * Save batch files to disk
   */
  async saveBatchFiles(batches) {
    const batchConfigs = []

    for (const batch of batches) {
      const filename = `batch_${batch.batchIndex
        .toString()
        .padStart(3, '0')}.json`
      const filePath = path.join(this.options.outputDir, filename)

      // Create batch metadata
      const batchData = {
        batchIndex: batch.batchIndex,
        totalBatches: batches.length,
        size: batch.size,
        startIndex: batch.startIndex,
        endIndex: batch.endIndex,
        year: batch.year || null,
        subBatch: batch.subBatch || null,
        createdAt: new Date().toISOString(),
        laws: batch.laws,
      }

      // Save batch file
      await fs.promises.writeFile(
        filePath,
        JSON.stringify(batchData, null, 2),
        'utf8'
      )

      // Create config entry
      batchConfigs.push({
        batchIndex: batch.batchIndex,
        filename: filename,
        filePath: filePath,
        size: batch.size,
        year: batch.year || null,
        startIndex: batch.startIndex,
        endIndex: batch.endIndex,
      })

      this.log(`Created batch file: ${filename} (${batch.size} laws)`)
    }

    return batchConfigs
  }

  /**
   * Save batch configuration file
   */
  async saveBatchConfiguration(batchConfigs, totalLaws) {
    const config = {
      totalLaws,
      totalBatches: batchConfigs.length,
      strategy: this.options.strategy,
      batchSize: this.options.batchSize,
      sortOrder: this.options.sortOrder,
      createdAt: new Date().toISOString(),
      batches: batchConfigs,
    }

    await fs.promises.writeFile(
      this.options.batchConfigPath,
      JSON.stringify(config, null, 2),
      'utf8'
    )

    this.log(`Saved batch configuration: ${this.options.batchConfigPath}`)
  }

  /**
   * Load existing batch configuration
   */
  async loadBatchConfiguration() {
    if (!fs.existsSync(this.options.batchConfigPath)) {
      return null
    }

    const content = await fs.promises.readFile(
      this.options.batchConfigPath,
      'utf8'
    )
    return JSON.parse(content)
  }

  /**
   * Get batch indices for GitHub Actions matrix
   */
  async getBatchIndicesForMatrix() {
    const config = await this.loadBatchConfiguration()
    if (!config) {
      throw new Error(
        'No batch configuration found. Run createBatches() first.'
      )
    }

    return config.batches.map((batch) => batch.batchIndex)
  }

  /**
   * Get specific batch data for processing
   */
  async getBatchData(batchIndex) {
    const config = await this.loadBatchConfiguration()
    if (!config) {
      throw new Error('No batch configuration found.')
    }

    const batchConfig = config.batches.find((b) => b.batchIndex === batchIndex)
    if (!batchConfig) {
      throw new Error(`Batch ${batchIndex} not found in configuration.`)
    }

    const batchPath = path.join(this.options.outputDir, batchConfig.filename)
    if (!fs.existsSync(batchPath)) {
      throw new Error(`Batch file not found: ${batchPath}`)
    }

    const content = await fs.promises.readFile(batchPath, 'utf8')
    return JSON.parse(content)
  }

  /**
   * Clean up batch files
   */
  async cleanupBatchFiles() {
    if (fs.existsSync(this.options.outputDir)) {
      const files = await fs.promises.readdir(this.options.outputDir)

      for (const file of files) {
        if (file.startsWith('batch_') && file.endsWith('.json')) {
          const filePath = path.join(this.options.outputDir, file)
          await fs.promises.unlink(filePath)
          this.log(`Deleted batch file: ${file}`)
        }
      }
    }

    if (fs.existsSync(this.options.batchConfigPath)) {
      await fs.promises.unlink(this.options.batchConfigPath)
      this.log('Deleted batch configuration file')
    }
  }

  /**
   * Logging with timestamp
   */
  log(message) {
    const timestamp = new Date().toISOString()
    console.log(`[BatchProcessor][${timestamp}] ${message}`)
  }
}

export default BatchProcessor
