// Скрипт за проверка на закони без текст в JSON файловете
// Използвай Node.js

const fs = require('fs')
const path = require('path')

const publicDir = path.join(__dirname, 'public')
const chunkFiles = fs
  .readdirSync(publicDir)
  .filter((f) => f.startsWith('all_laws_full_chunk_') && f.endsWith('.json'))

const lawsWithoutText = []

chunkFiles.forEach((file) => {
  const filePath = path.join(publicDir, file)
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  data.forEach((law) => {
    if (!law.text || law.text.trim() === '') {
      lawsWithoutText.push({
        file,
        title: law.title || '',
        meta: law.meta || '',
        date: law.date || '',
      })
    }
  })
})

console.log('Закони без текст:', lawsWithoutText)
console.log('Общ брой:', lawsWithoutText.length)
