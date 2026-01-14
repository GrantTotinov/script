#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

console.log(`
🎯 ФИНАЛЕН STATUS НА ЗАВЪРШВАНЕ НА ВСИЧКО
${'='.repeat(80)}

📊 ТЕКУЩО СЪСТОЯНИЕ:
`)

// Check enhanced laws progress
let files = []
const enhancedDir = './scraped_laws_enhanced'
if (fs.existsSync(enhancedDir)) {
  files = fs
    .readdirSync(enhancedDir)
    .filter((f) => f.endsWith('.json') && !f.includes('summary'))
  let totalSize = 0
  files.forEach((file) => {
    totalSize += fs.statSync(path.join(enhancedDir, file)).size
  })

  console.log(`   ✅ Enhanced laws: ${files.length}`)
  console.log(`   💾 Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`)
  console.log(
    `   📈 Average size: ${(totalSize / files.length / 1024).toFixed(
      1
    )} KB per law`
  )
}

// Check automation progress
if (fs.existsSync('./automation_progress.json')) {
  const progress = JSON.parse(
    fs.readFileSync('./automation_progress.json', 'utf8')
  )
  console.log(`\n🔄 AUTOMATION PROGRESS:`)
  console.log(
    `   Batches: ${progress.completedBatches}/${progress.totalBatches}`
  )
  console.log(
    `   Success rate: ${Math.round(
      (progress.successfulLaws /
        (progress.successfulLaws + progress.failedLaws)) *
        100
    )}%`
  )
  console.log(
    `   Total processed: ${progress.successfulLaws + progress.failedLaws} laws`
  )
}

// Check batch manifest
if (fs.existsSync('./batch_manifest.json')) {
  const manifest = JSON.parse(fs.readFileSync('./batch_manifest.json', 'utf8'))
  console.log(`\n📦 BATCH SYSTEM:`)
  console.log(`   Total batches created: ${manifest.totalBatches}`)
  console.log(`   Laws per batch: ${manifest.batchSize}`)
  console.log(`   Total laws to process: ${manifest.totalLaws}`)

  const remainingLaws = manifest.totalLaws - files.length
  console.log(`   Remaining: ${remainingLaws} laws`)

  if (remainingLaws > 0) {
    const estimatedHours = (remainingLaws * 0.28) / 60 // 0.28 min per law
    console.log(`   Estimated time left: ${estimatedHours.toFixed(1)} hours`)
  }
}

// Calculate improvement stats
const originalDir = './scraped_laws'
if (fs.existsSync(originalDir) && fs.existsSync(enhancedDir)) {
  const originalFiles = fs
    .readdirSync(originalDir)
    .filter((f) => f.endsWith('.json'))
  const enhancedFiles = fs
    .readdirSync(enhancedDir)
    .filter((f) => f.endsWith('.json') && !f.includes('summary'))

  // Calculate size improvement for common files
  let totalOriginalSize = 0
  let totalEnhancedSize = 0
  let improvedCount = 0

  enhancedFiles.forEach((file) => {
    const originalPath = path.join(originalDir, file)
    const enhancedPath = path.join(enhancedDir, file)

    if (fs.existsSync(originalPath)) {
      const originalSize = fs.statSync(originalPath).size
      const enhancedSize = fs.statSync(enhancedPath).size

      totalOriginalSize += originalSize
      totalEnhancedSize += enhancedSize
      improvedCount++
    }
  })

  if (improvedCount > 0) {
    const improvement = (totalEnhancedSize / totalOriginalSize - 1) * 100
    console.log(`\n📈 QUALITY IMPROVEMENTS:`)
    console.log(`   Improved laws: ${improvedCount}`)
    console.log(`   Size increase: +${improvement.toFixed(0)}%`)
    console.log(
      `   Average: ${(totalOriginalSize / improvedCount / 1024).toFixed(
        1
      )}KB → ${(totalEnhancedSize / improvedCount / 1024).toFixed(1)}KB`
    )
  }
}

console.log(`\n🚀 АКТИВНИ ПРОЦЕСИ:`)

// Check for running processes
try {
  const { execSync } = require('child_process')
  const processes = execSync('tasklist /FI "IMAGENAME eq node.exe" /FO CSV', {
    encoding: 'utf8',
  })
  const nodeProcesses =
    processes.split('\n').filter((line) => line.includes('node.exe')).length - 1

  if (nodeProcesses > 1) {
    console.log(`   🔄 ${nodeProcesses - 1} enhanced scraping processes active`)
    console.log(`   ⚡ Full automation is running!`)
  } else {
    console.log(`   💤 No active processes - automation may be complete`)
  }
} catch (error) {
  console.log(`   ❓ Could not check processes`)
}

console.log(`\n💡 ПОЛЕЗНИ КОМАНДИ:`)
console.log(`   node monitor.cjs           - Бърз status check`)
console.log(`   node monitor.cjs -c        - Continuous monitoring`)
console.log(`   node monitor_progress.cjs  - Детайлен прогрес репорт`)

if (fs.existsSync('./final_automation_report.json')) {
  console.log(`\n🎉 AUTOMATION COMPLETED!`)
  const report = JSON.parse(
    fs.readFileSync('./final_automation_report.json', 'utf8')
  )
  console.log(
    `   ✅ Success rate: ${Math.round(
      (report.successfulLaws / (report.successfulLaws + report.failedLaws)) *
        100
    )}%`
  )
  console.log(
    `   📊 Total processed: ${report.successfulLaws + report.failedLaws} laws`
  )
  console.log(`   💾 Final report available: final_automation_report.json`)
}

console.log(`\n${'='.repeat(80)}`)
console.log(
  `🎯 СТАТУС: ${
    fs.existsSync('./final_automation_report.json')
      ? '✅ ЗАВЪРШЕНО'
      : '🔄 В ХОД'
  }`
)
console.log(`${'='.repeat(80)}`)
