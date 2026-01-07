// Проверка за присъствие на ID 166100 в all_laws.json и chunk файловете, както и изкарване на meta полетата
const fs = require('fs')
const path = require('path')

const publicDir = path.join(__dirname, 'public')
const chunkFiles = fs
  .readdirSync(publicDir)
  .filter((f) => f.startsWith('all_laws_full_chunk_') && f.endsWith('.json'))

const targetID = '166100'
let foundInChunks = false
let foundInAllLaws = false
let metaInChunks = []
let metaInAllLaws = []

// Проверка в chunk файловете
chunkFiles.forEach((file) => {
  const filePath = path.join(publicDir, file)
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  data.forEach((law) => {
    if (
      law.meta &&
      typeof law.meta === 'string' &&
      law.meta.includes(`ID/${targetID}`)
    ) {
      foundInChunks = true
      metaInChunks.push(law.meta)
    }
  })
})

// Проверка в all_laws.json
const allLawsPath = path.join(publicDir, 'all_laws.json')
const allLaws = JSON.parse(fs.readFileSync(allLawsPath, 'utf8'))
allLaws.forEach((law) => {
  if (
    law.meta &&
    typeof law.meta === 'string' &&
    law.meta.includes(`ID/${targetID}`)
  ) {
    foundInAllLaws = true
    metaInAllLaws.push(law.meta)
  }
})

console.log('Присъства ли 166100 в chunk файловете:', foundInChunks)
console.log('meta в chunk файловете:', metaInChunks)
console.log('Присъства ли 166100 в all_laws.json:', foundInAllLaws)
console.log('meta в all_laws.json:', metaInAllLaws)
