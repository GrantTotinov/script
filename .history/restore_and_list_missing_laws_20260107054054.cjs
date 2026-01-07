// restore_and_list_missing_laws.cjs
// Скрипт за възстановяване на липсващите scrape-нати закони от последния анализ (от историята на скрипта)
// Ще използва логиката от .history/list_missing_laws_by_link_20260107045434.cjs

const fs = require('fs')
const path = require('path')

const publicDir = path.join(__dirname, 'public')
const chunkFiles = fs
  .readdirSync(publicDir)
  .filter((f) => f.startsWith('all_laws_full_chunk_') && f.endsWith('.json'))

// 1. Събиране на всички meta линкове от chunk файловете
const chunkLinks = new Set()
chunkFiles.forEach((file) => {
  const filePath = path.join(publicDir, file)
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  data.forEach((law) => {
    if (law.meta && typeof law.meta === 'string') {
      chunkLinks.add(law.meta)
    }
    // Ако meta е масив, вземи всички елементи
    if (Array.isArray(law.meta)) {
      law.meta.forEach((m) => chunkLinks.add(m))
    }
  })
})

// 2. Събиране на всички закони от all_laws.json, които ги няма в chunk файловете
const allLawsPath = path.join(publicDir, 'all_laws.json')
const allLaws = JSON.parse(fs.readFileSync(allLawsPath, 'utf8'))
const missingLaws = []
allLaws.forEach((law) => {
  if (law.link && typeof law.link === 'string' && !chunkLinks.has(law.link)) {
    missingLaws.push({ title: law.title, link: law.link })
  }
})

fs.writeFileSync(
  path.join(__dirname, 'missing_laws_before_patch.json'),
  JSON.stringify(missingLaws, null, 2),
  'utf8'
)
console.log('Общ брой липсващи:', missingLaws.length)
console.log('missing_laws_before_patch.json е създаден!')
