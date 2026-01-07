// add_missing_laws_to_chunks.cjs
// Добавя липсващите scrape-нати закони от all_laws.json в chunk файловете (all_laws_full_chunk_*.json)
// Ако chunk-ът надвиши 1000 записа, създава нов chunk файл.

const fs = require('fs')
const path = require('path')

const CHUNKS_DIR = path.join(__dirname, 'public')
const CHUNK_PREFIX = 'all_laws_full_chunk_'
const CHUNK_SUFFIX = '.json'
const CHUNK_LIMIT = 1000
const ALL_LAWS_PATH = path.join(CHUNKS_DIR, 'all_laws.json')

// 1. Прочети всички chunk файлове
const chunkFiles = fs
  .readdirSync(CHUNKS_DIR)
  .filter((f) => f.startsWith(CHUNK_PREFIX) && f.endsWith(CHUNK_SUFFIX))
  .sort((a, b) => {
    // Сортирай по номер на chunk
    const aNum = parseInt(a.match(/_(\d+)\.json$/)[1], 10)
    const bNum = parseInt(b.match(/_(\d+)\.json$/)[1], 10)
    return aNum - bNum
  })

// 2. Прочети всички закони от chunk файловете
let allChunkLaws = []
let chunkData = []
chunkFiles.forEach((f) => {
  const arr = JSON.parse(fs.readFileSync(path.join(CHUNKS_DIR, f), 'utf8'))
  chunkData.push(arr)
  allChunkLaws = allChunkLaws.concat(arr)
})

// 3. Прочети всички scrape-нати закони
const allLaws = JSON.parse(fs.readFileSync(ALL_LAWS_PATH, 'utf8'))

// 4. Индексирай chunk законите по link/meta
const chunkLinks = new Set(
  allChunkLaws.map((law) =>
    (law.link || (law.meta && law.meta[0]) || '').trim()
  )
)

// 5. Открий липсващите scrape-нати закони (по link)
const missingLaws = allLaws.filter((law) => !chunkLinks.has(law.link.trim()))

console.log(`Липсващи scrape-нати закони: ${missingLaws.length}`)

if (missingLaws.length === 0) {
  console.log('Няма липсващи scrape-нати закони.')
  process.exit(0)
}

// 6. Подготви нови записи за добавяне
const newLaws = missingLaws.map((law) => ({
  title: law.title,
  date: law.date || '',
  link: law.link,
  meta: [],
  text: '',
}))

// 7. Добави новите закони към последния chunk (или създай нови chunk-ове при нужда)
let lastChunk = chunkData[chunkData.length - 1]
let chunkIdx = chunkData.length - 1

newLaws.forEach((law) => {
  if (lastChunk.length >= CHUNK_LIMIT) {
    // Създай нов chunk
    lastChunk = []
    chunkData.push(lastChunk)
    chunkIdx++
  }
  lastChunk.push(law)
})

// 8. Запиши всички chunk файлове обратно
chunkData.forEach((arr, idx) => {
  const fname = `${CHUNKS_DIR}/${CHUNK_PREFIX}${idx}${CHUNK_SUFFIX}`
  fs.writeFileSync(fname, JSON.stringify(arr, null, 2), 'utf8')
  console.log(`Записан: ${fname} (${arr.length} закона)`)
})

console.log('Готово! Всички scrape-нати закони са добавени в chunk файловете.')
