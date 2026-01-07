// Скрипт за почистване на chunk JSON файлове от записи без текст и без валиден meta линк с ID
const fs = require('fs')
const path = require('path')

const publicDir = path.join(__dirname, 'public')
const chunkFiles = fs
  .readdirSync(publicDir)
  .filter((f) => f.startsWith('all_laws_full_chunk_') && f.endsWith('.json'))

chunkFiles.forEach((file) => {
  const filePath = path.join(publicDir, file)
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  const cleaned = data.filter((law) => {
    // Запази ако има текст
    if (law.text && law.text.trim() !== '') return true
    // Запази ако има валиден meta линк с ID
    if (law.meta && typeof law.meta === 'string' && /ID\/(\d+)/.test(law.meta))
      return true
    // Всичко друго се премахва
    return false
  })
  fs.writeFileSync(filePath, JSON.stringify(cleaned, null, 2), 'utf8')
  console.log(
    `Почистен файл: ${file}, премахнати: ${data.length - cleaned.length}`
  )
})
