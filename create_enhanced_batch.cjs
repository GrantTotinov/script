const fs = require('fs')

// Create a batch from the main rescrape list
const allLaws = JSON.parse(fs.readFileSync('./laws_to_rescrape.json', 'utf8'))
const batchSize = 30
const firstBatch = allLaws.slice(0, batchSize)

fs.writeFileSync('./enhanced_batch_1.json', JSON.stringify(firstBatch, null, 2))

console.log(`Created batch of ${firstBatch.length} laws for enhanced scraping:`)
console.log(`First few: ${firstBatch.slice(0, 5).join(', ')}`)
console.log(`Total remaining: ${allLaws.length - batchSize}`)
