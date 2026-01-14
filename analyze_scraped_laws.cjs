const fs = require('fs')
const path = require('path')

function analyzeScrapedLaws() {
  const scrapedDir = './scraped_laws'
  const results = {
    totalLaws: 0,
    validLaws: 0,
    problematicLaws: [],
    sizeStats: {
      small: 0, // < 1KB
      medium: 0, // 1KB - 100KB
      large: 0, // 100KB - 500KB
      veryLarge: 0, // > 500KB
    },
    textQualityIssues: {
      endsWithNumbers: [],
      tooShort: [],
      noFullText: [],
      containsGarbage: [],
      truncated: [],
    },
  }

  if (!fs.existsSync(scrapedDir)) {
    console.log('❌ Scraped laws directory not found')
    return results
  }

  const files = fs.readdirSync(scrapedDir).filter((f) => f.endsWith('.json'))
  results.totalLaws = files.length

  console.log(`📊 Analyzing ${results.totalLaws} scraped laws...\n`)

  files.forEach((file, index) => {
    const filePath = path.join(scrapedDir, file)
    const stats = fs.statSync(filePath)
    const lawId = file.replace('.json', '')

    // Size analysis
    const sizeKB = stats.size / 1024
    if (sizeKB < 1) results.sizeStats.small++
    else if (sizeKB < 100) results.sizeStats.medium++
    else if (sizeKB < 500) results.sizeStats.large++
    else results.sizeStats.veryLarge++

    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const lawData = JSON.parse(content)

      let hasIssues = false
      const issues = []

      // Check for missing fullText
      if (!lawData.fullText || lawData.fullText.length === 0) {
        results.textQualityIssues.noFullText.push(lawId)
        issues.push('no_full_text')
        hasIssues = true
      } else {
        // Check text length
        if (lawData.fullText.length < 500) {
          results.textQualityIssues.tooShort.push(lawId)
          issues.push('too_short')
          hasIssues = true
        }

        // Check if text ends with numbers/tables (potential truncation)
        const lastChars = lawData.fullText.slice(-200).trim()
        const numberPattern = /\d+[\s\d.,]*$/
        if (numberPattern.test(lastChars)) {
          results.textQualityIssues.endsWithNumbers.push(lawId)
          issues.push('ends_with_numbers')
          hasIssues = true
        }

        // Check for encoding issues or garbage text
        const garbagePattern = /[�\ufffd]|Ð[^а-я]/gi
        if (garbagePattern.test(lawData.fullText)) {
          results.textQualityIssues.containsGarbage.push(lawId)
          issues.push('encoding_issues')
          hasIssues = true
        }

        // Check for truncation markers
        if (
          lawData.fullText.includes('Text truncated from') ||
          lawData.fullText.includes('[TRUNCATED]') ||
          lawData.fullText.length >= 1000000
        ) {
          results.textQualityIssues.truncated.push(lawId)
          issues.push('truncated')
          hasIssues = true
        }
      }

      if (hasIssues) {
        results.problematicLaws.push({
          lawId,
          sizeKB: Math.round(sizeKB * 100) / 100,
          textLength: lawData.fullText ? lawData.fullText.length : 0,
          issues,
          title: lawData.title || 'Unknown',
        })
      } else {
        results.validLaws++
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message)
      results.problematicLaws.push({
        lawId,
        sizeKB: Math.round(sizeKB * 100) / 100,
        textLength: 0,
        issues: ['parse_error'],
        title: 'Parse Error',
      })
    }

    // Progress indicator
    if ((index + 1) % 100 === 0) {
      console.log(`⏳ Processed ${index + 1}/${results.totalLaws} laws...`)
    }
  })

  return results
}

function generateReport(results) {
  console.log('\n' + '='.repeat(80))
  console.log('📈 SCRAPED LAWS ANALYSIS REPORT')
  console.log('='.repeat(80))

  console.log(`\n📊 OVERVIEW:`)
  console.log(`   Total Laws: ${results.totalLaws}`)
  console.log(
    `   Valid Laws: ${results.validLaws} (${Math.round(
      (results.validLaws / results.totalLaws) * 100
    )}%)`
  )
  console.log(
    `   Problematic Laws: ${results.problematicLaws.length} (${Math.round(
      (results.problematicLaws.length / results.totalLaws) * 100
    )}%)`
  )

  console.log(`\n💾 SIZE DISTRIBUTION:`)
  console.log(`   Small (< 1KB): ${results.sizeStats.small}`)
  console.log(`   Medium (1-100KB): ${results.sizeStats.medium}`)
  console.log(`   Large (100-500KB): ${results.sizeStats.large}`)
  console.log(`   Very Large (> 500KB): ${results.sizeStats.veryLarge}`)

  console.log(`\n⚠️  QUALITY ISSUES:`)
  console.log(`   No Full Text: ${results.textQualityIssues.noFullText.length}`)
  console.log(`   Too Short: ${results.textQualityIssues.tooShort.length}`)
  console.log(
    `   Ends with Numbers: ${results.textQualityIssues.endsWithNumbers.length}`
  )
  console.log(
    `   Encoding Issues: ${results.textQualityIssues.containsGarbage.length}`
  )
  console.log(`   Truncated: ${results.textQualityIssues.truncated.length}`)

  // Show top 10 most problematic laws
  const sortedProblems = results.problematicLaws
    .sort((a, b) => b.issues.length - a.issues.length)
    .slice(0, 10)

  console.log(`\n🔍 TOP 10 MOST PROBLEMATIC LAWS:`)
  sortedProblems.forEach((law, i) => {
    console.log(
      `   ${i + 1}. ${law.lawId} (${law.sizeKB}KB) - Issues: ${law.issues.join(
        ', '
      )}`
    )
    console.log(
      `      Title: ${law.title.substring(0, 60)}${
        law.title.length > 60 ? '...' : ''
      }`
    )
  })

  // Save detailed report
  const reportPath = './scraped_laws_analysis.json'
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2))
  console.log(`\n💾 Detailed report saved to: ${reportPath}`)

  // Generate list of laws needing re-scraping
  const problematicIds = results.problematicLaws.map((law) => law.lawId)
  const rescrapeListPath = './laws_to_rescrape.json'
  fs.writeFileSync(rescrapeListPath, JSON.stringify(problematicIds, null, 2))
  console.log(
    `📝 Re-scrape list saved to: ${rescrapeListPath} (${problematicIds.length} laws)`
  )

  return results
}

// Run analysis
if (require.main === module) {
  console.log('🔍 Starting analysis of scraped laws...\n')
  const results = analyzeScrapedLaws()
  generateReport(results)
}

module.exports = { analyzeScrapedLaws, generateReport }
