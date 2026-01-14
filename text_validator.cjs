const fs = require('fs')
const path = require('path')

class TextValidator {
  constructor() {
    // Patterns for detecting valid law endings
    this.validEndingPatterns = [
      // Typical law endings in Bulgarian
      /чл\.\s*\d+.*$/i, // Article endings
      /параграф\s*\d+.*$/i, // Paragraph endings
      /влиза в сила/i, // "comes into force"
      /отменя се/i, // "is repealed"
      /допълва се/i, // "is amended"
      /изменя се/i, // "is changed"
      /настоящия закон/i, // "this law"
      /публикува.*държавен вестник/i, // "published in Official Gazette"
      /отменят се/i, // "are repealed"
      /в сила от/i, // "in force from"
      /заличава се/i, // "is deleted"
      /добавя се/i, // "is added"
      /запазва се/i, // "is preserved"
    ]

    // Patterns for detecting table/number endings (invalid)
    this.invalidEndingPatterns = [
      /^\s*\d+[\s\d.,\-]+$/, // Just numbers and spaces
      /^\s*[\d\s.,\-]*\d+\s*$/, // Numbers at the end
      /^\s*\d+\s*[а-я\s]*\d+\s*$/i, // Numbers with few cyrillic chars
      /^\s*OP-\d+/i, // Project codes
      /^\s*СМР/i, // Construction codes
      /^\s*Инженеринг/i, // Engineering entries
      /^\s*Община\s+/i, // Municipality entries (without law content)
      /^\s*област\s+/i, // Region entries
      /^\s*км\s*$/, // Just "km"
      /^\s*[\d\s]+м\s*$/, // Just meters
      /^\s*[\d\s]+лв\s*$/, // Just leva (currency)
    ]

    // Patterns for detecting incomplete/truncated content
    this.truncationIndicators = [
      /\[TRUNCATED\]/i,
      /Text truncated from/i,
      /\.\.\./,
      /и т\.н\.?\s*$/i, // "etc." at the end
      /продължава/i, // "continues"
    ]
  }

  validateLawText(lawData) {
    const result = {
      isValid: true,
      issues: [],
      severity: 'none', // none, low, medium, high, critical
      recommendations: [],
    }

    const { fullText, lawId, title } = lawData

    // Check if fullText exists
    if (!fullText || fullText.length === 0) {
      result.isValid = false
      result.issues.push('no_full_text')
      result.severity = 'critical'
      result.recommendations.push('Complete re-scrape required')
      return result
    }

    // Check text length
    if (fullText.length < 100) {
      result.isValid = false
      result.issues.push('extremely_short')
      result.severity = 'critical'
      result.recommendations.push('Text too short - likely scraping error')
    } else if (fullText.length < 500) {
      result.isValid = false
      result.issues.push('very_short')
      result.severity = 'high'
      result.recommendations.push('Text very short - verify content quality')
    }

    // Analyze the last 500 characters for quality
    const endingText = fullText.slice(-500).trim()
    const lastLines = endingText.split('\n').slice(-10).join('\n').trim()

    // Check for invalid endings
    let hasValidEnding = false
    for (const pattern of this.validEndingPatterns) {
      if (pattern.test(lastLines)) {
        hasValidEnding = true
        break
      }
    }

    let hasInvalidEnding = false
    for (const pattern of this.invalidEndingPatterns) {
      if (pattern.test(lastLines)) {
        hasInvalidEnding = true
        break
      }
    }

    if (hasInvalidEnding) {
      result.isValid = false
      result.issues.push('ends_with_table_data')
      result.severity = result.severity === 'critical' ? 'critical' : 'high'
      result.recommendations.push(
        'Text ends with table/numeric data instead of law content'
      )
    }

    if (!hasValidEnding && !hasInvalidEnding) {
      // Check if it's just an unusual but potentially valid ending
      const wordCount = lastLines.split(/\s+/).length
      if (wordCount < 5) {
        result.isValid = false
        result.issues.push('suspicious_ending')
        result.severity = result.severity === 'critical' ? 'critical' : 'medium'
        result.recommendations.push('Ending seems incomplete or unusual')
      }
    }

    // Check for truncation indicators
    for (const pattern of this.truncationIndicators) {
      if (pattern.test(fullText)) {
        result.isValid = false
        result.issues.push('truncated')
        result.severity = result.severity === 'critical' ? 'critical' : 'high'
        result.recommendations.push('Text appears to be truncated')
        break
      }
    }

    // Check for encoding issues
    if (/[�\ufffd]/.test(fullText)) {
      result.isValid = false
      result.issues.push('encoding_issues')
      result.severity = result.severity === 'critical' ? 'critical' : 'medium'
      result.recommendations.push('Text has encoding issues')
    }

    // Analyze content structure
    const paragraphs = fullText.split('\n\n').filter((p) => p.trim().length > 0)
    if (paragraphs.length < 3) {
      result.issues.push('poor_structure')
      if (result.severity === 'none') result.severity = 'low'
      result.recommendations.push('Text has poor paragraph structure')
    }

    // Check for reasonable law-like content
    const lawKeywords = [
      'закон',
      'член',
      'параграф',
      'алинея',
      'точка',
      'изменя',
      'допълва',
    ]
    const hasLawKeywords = lawKeywords.some((keyword) =>
      fullText.toLowerCase().includes(keyword)
    )

    if (!hasLawKeywords) {
      result.isValid = false
      result.issues.push('no_law_content')
      result.severity = result.severity === 'critical' ? 'critical' : 'high'
      result.recommendations.push(
        'Text does not contain typical law terminology'
      )
    }

    return result
  }

  validateAllLaws(scrapedDir = './scraped_laws') {
    const validationResults = {
      total: 0,
      valid: 0,
      invalid: 0,
      bySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      byIssueType: {},
      detailedResults: [],
    }

    if (!fs.existsSync(scrapedDir)) {
      console.log('❌ Scraped laws directory not found')
      return validationResults
    }

    const files = fs.readdirSync(scrapedDir).filter((f) => f.endsWith('.json'))
    validationResults.total = files.length

    console.log(`🔍 Validating ${files.length} law texts...\n`)

    files.forEach((file, index) => {
      const lawId = file.replace('.json', '')
      const filePath = path.join(scrapedDir, file)

      try {
        const lawData = JSON.parse(fs.readFileSync(filePath, 'utf8'))
        const validation = this.validateLawText({ ...lawData, lawId })

        if (validation.isValid) {
          validationResults.valid++
        } else {
          validationResults.invalid++
          validationResults.bySeverity[validation.severity]++

          // Count issue types
          validation.issues.forEach((issue) => {
            validationResults.byIssueType[issue] =
              (validationResults.byIssueType[issue] || 0) + 1
          })
        }

        validationResults.detailedResults.push({
          lawId,
          ...validation,
          textLength: lawData.fullText ? lawData.fullText.length : 0,
          title: lawData.title || 'Unknown',
        })
      } catch (error) {
        console.error(`❌ Error validating ${file}:`, error.message)
        validationResults.invalid++
        validationResults.bySeverity.critical++
        validationResults.detailedResults.push({
          lawId,
          isValid: false,
          issues: ['parse_error'],
          severity: 'critical',
          recommendations: ['File cannot be parsed'],
          textLength: 0,
          title: 'Parse Error',
        })
      }

      // Progress indicator
      if ((index + 1) % 100 === 0) {
        console.log(`⏳ Validated ${index + 1}/${files.length} laws...`)
      }
    })

    return validationResults
  }

  generateValidationReport(results) {
    console.log('\n' + '='.repeat(80))
    console.log('📋 LAW TEXT VALIDATION REPORT')
    console.log('='.repeat(80))

    console.log(`\n📊 VALIDATION SUMMARY:`)
    console.log(`   Total Laws: ${results.total}`)
    console.log(
      `   Valid: ${results.valid} (${Math.round(
        (results.valid / results.total) * 100
      )}%)`
    )
    console.log(
      `   Invalid: ${results.invalid} (${Math.round(
        (results.invalid / results.total) * 100
      )}%)`
    )

    console.log(`\n🚨 BY SEVERITY:`)
    console.log(`   Critical: ${results.bySeverity.critical}`)
    console.log(`   High: ${results.bySeverity.high}`)
    console.log(`   Medium: ${results.bySeverity.medium}`)
    console.log(`   Low: ${results.bySeverity.low}`)

    console.log(`\n🔍 ISSUE TYPES:`)
    Object.entries(results.byIssueType)
      .sort(([, a], [, b]) => b - a)
      .forEach(([issue, count]) => {
        console.log(`   ${issue}: ${count}`)
      })

    // Show critical cases that need immediate attention
    const criticalCases = results.detailedResults
      .filter((r) => r.severity === 'critical')
      .slice(0, 10)

    console.log(`\n🚨 CRITICAL CASES (First 10):`)
    criticalCases.forEach((law, i) => {
      console.log(`   ${i + 1}. ${law.lawId} - ${law.issues.join(', ')}`)
      console.log(
        `      ${law.title.substring(0, 60)}${
          law.title.length > 60 ? '...' : ''
        }`
      )
    })

    // Save detailed validation report
    const reportPath = './text_validation_report.json'
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2))
    console.log(`\n💾 Detailed validation report saved to: ${reportPath}`)

    // Generate priority lists for re-scraping
    const priorityLists = {
      critical: results.detailedResults
        .filter((r) => r.severity === 'critical')
        .map((r) => r.lawId),
      high: results.detailedResults
        .filter((r) => r.severity === 'high')
        .map((r) => r.lawId),
      medium: results.detailedResults
        .filter((r) => r.severity === 'medium')
        .map((r) => r.lawId),
    }

    Object.entries(priorityLists).forEach(([severity, lawIds]) => {
      if (lawIds.length > 0) {
        const filename = `./rescrape_priority_${severity}.json`
        fs.writeFileSync(filename, JSON.stringify(lawIds, null, 2))
        console.log(
          `📝 ${severity} priority re-scrape list: ${filename} (${lawIds.length} laws)`
        )
      }
    })

    return results
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new TextValidator()
  console.log('🔍 Starting comprehensive text validation...\n')
  const results = validator.validateAllLaws()
  validator.generateValidationReport(results)
}

module.exports = TextValidator
