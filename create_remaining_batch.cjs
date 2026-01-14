const fs = require('fs')

// Create remaining batch (skip first law that was successful)
const allLaws = JSON.parse(fs.readFileSync('./enhanced_batch_1.json', 'utf8'))
const remainingBatch = allLaws.slice(1) // Skip first one that succeeded

fs.writeFileSync(
  './enhanced_batch_1_remaining.json',
  JSON.stringify(remainingBatch, null, 2)
)

console.log(`Created remaining batch of ${remainingBatch.length} laws`)
console.log(
  `Starting from: ${remainingBatch[0]} to ${
    remainingBatch[remainingBatch.length - 1]
  }`
)
