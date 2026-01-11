// This helper splits the work for parallel scraping in GitHub Actions.
// Usage: node split_laws.js all_laws.json 10
// It will create scraped_laws_chunk_0.json, scraped_laws_chunk_1.json, ...

const fs = require('fs')
const path = require('path')

const [, , inputFile, numChunks] = process.argv
const allLaws = JSON.parse(fs.readFileSync(inputFile, 'utf-8'))
const chunkSize = Math.ceil(allLaws.length / numChunks)

for (let i = 0; i < numChunks; i++) {
  const chunk = allLaws.slice(i * chunkSize, (i + 1) * chunkSize)
  fs.writeFileSync(`laws_chunk_${i}.json`, JSON.stringify(chunk, null, 2))
}

console.log(`Split ${allLaws.length} laws into ${numChunks} chunks.`)
