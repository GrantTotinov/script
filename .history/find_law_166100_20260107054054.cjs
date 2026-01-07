// Скрипт за търсене на закон с ID 166100 във всички chunk файлове
const fs = require('fs')
const path = require('path')

const publicDir = path.join(__dirname, 'public')
const chunkFiles = fs
  .readdirSync(publicDir)
  .filter((f) => f.startsWith('all_laws_full_chunk_') && f.endsWith('.json'))

const targetID = '166100'
let found = false

chunkFiles.forEach((file) => {
  const filePath = path.join(publicDir, file)
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  data.forEach((law, idx) => {
    if (
      law.meta &&
      typeof law.meta === 'string' &&
      law.meta.includes(`ID/${targetID}`)
    ) {
      found = true
      console.log(`Намерено в файл: ${file}, позиция: ${idx}`)
      console.log(law)
    }
  })
})

if (!found) {
  console.log(`Закон с ID ${targetID} не е намерен в chunk файловете.`)
}
