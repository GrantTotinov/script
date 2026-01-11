/**
 * JSON Schemas for Bulgarian Laws Scraping System
 * Defines the structure of input and output data for the scraping process
 */

/**
 * Input Law Schema
 * @typedef {Object} InputLaw
 * @property {string} title - The law title as appears in the listing
 * @property {string} date - The law date (may be empty string)
 * @property {string} link - Full URL to the law page on parliament.bg
 */

/**
 * Output Law Schema (fully scraped)
 * @typedef {Object} ScrapedLaw
 * @property {string} title - The original title from listing
 * @property {string} date - The original date from listing
 * @property {string} link - The law URL
 * @property {string} lawId - Extracted law ID from URL
 * @property {string} actualTitle - The actual title as found on the law page
 * @property {string[]} metadata - Array of metadata strings from law-details section
 * @property {string} fullText - The complete extracted law text
 * @property {number} textLength - Length of the extracted text
 * @property {string} scrapedAt - ISO timestamp when the law was scraped
 * @property {boolean} isComplete - Whether the scraping was successful
 * @property {string|null} error - Error message if scraping failed
 * @property {number} retryCount - Number of retry attempts made
 */

/**
 * Batch Configuration Schema
 * @typedef {Object} BatchConfig
 * @property {number} batchIndex - Index of this batch (0-based)
 * @property {number} totalBatches - Total number of batches
 * @property {number} startIndex - Starting index in the full laws array
 * @property {number} endIndex - Ending index in the full laws array (exclusive)
 * @property {number} batchSize - Number of laws in this batch
 */

/**
 * Scraping Progress Schema
 * @typedef {Object} ScrapingProgress
 * @property {number} batchIndex - Current batch index
 * @property {number} totalLaws - Total number of laws to scrape
 * @property {number} processedLaws - Number of laws processed so far
 * @property {number} successfulLaws - Number of successfully scraped laws
 * @property {number} failedLaws - Number of failed laws
 * @property {string[]} failedLawIds - Array of law IDs that failed to scrape
 * @property {string} startedAt - ISO timestamp when batch started
 * @property {string|null} completedAt - ISO timestamp when batch completed
 * @property {boolean} isComplete - Whether the batch is complete
 */

/**
 * Failed Law Schema
 * @typedef {Object} FailedLaw
 * @property {string} lawId - Law ID that failed
 * @property {string} link - URL that failed to scrape
 * @property {string} title - Original law title
 * @property {string} error - Error message
 * @property {number} retryCount - Number of retries attempted
 * @property {string} failedAt - ISO timestamp of failure
 * @property {string} batchId - Which batch this failure occurred in
 */

// Helper function to validate input law
export const validateInputLaw = (law) => {
  if (!law || typeof law !== 'object') return false
  if (typeof law.title !== 'string' || !law.title.trim()) return false
  if (typeof law.date !== 'string') return false
  if (typeof law.link !== 'string' || !law.link.includes('parliament.bg'))
    return false
  return true
}

// Helper function to extract law ID from URL
export const extractLawId = (url) => {
  const match = url.match(/\/ID\/(\d+)/)
  return match ? match[1] : null
}

// Helper function to create a scraped law object
export const createScrapedLaw = (inputLaw, scrapingData = {}) => {
  const lawId = extractLawId(inputLaw.link)
  return {
    title: inputLaw.title,
    date: inputLaw.date,
    link: inputLaw.link,
    lawId: lawId,
    actualTitle: scrapingData.actualTitle || '',
    metadata: scrapingData.metadata || [],
    fullText: scrapingData.fullText || '',
    textLength: (scrapingData.fullText || '').length,
    scrapedAt: new Date().toISOString(),
    isComplete: Boolean(
      scrapingData.fullText && scrapingData.fullText.length > 50
    ),
    error: scrapingData.error || null,
    retryCount: scrapingData.retryCount || 0,
  }
}

// Helper function to create a failed law entry
export const createFailedLaw = (
  inputLaw,
  error,
  retryCount = 0,
  batchId = ''
) => {
  const lawId = extractLawId(inputLaw.link)
  return {
    lawId: lawId,
    link: inputLaw.link,
    title: inputLaw.title,
    error: error,
    retryCount: retryCount,
    failedAt: new Date().toISOString(),
    batchId: batchId,
  }
}
