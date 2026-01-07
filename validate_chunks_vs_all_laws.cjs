// validate_chunks_vs_all_laws.cjs
// Скрипт за валидация: всички scrape-нати закони от all_laws.json да присъстват в chunk файловете (по link)

const fs = require('fs');
const path = require('path');

const CHUNKS_DIR = path.join(__dirname, 'public');
const CHUNK_PREFIX = 'all_laws_full_chunk_';
const CHUNK_SUFFIX = '.json';
const ALL_LAWS_PATH = path.join(CHUNKS_DIR, 'all_laws.json');

const chunkFiles = fs.readdirSync(CHUNKS_DIR)
  .filter(f => f.startsWith(CHUNK_PREFIX) && f.endsWith(CHUNK_SUFFIX));

let allChunkLaws = [];
chunkFiles.forEach(f => {
  const arr = JSON.parse(fs.readFileSync(path.join(CHUNKS_DIR, f), 'utf8'));
  allChunkLaws = allChunkLaws.concat(arr);
});

const allLaws = JSON.parse(fs.readFileSync(ALL_LAWS_PATH, 'utf8'));
const chunkLinks = new Set(
  allChunkLaws.map(law => (law.link || (law.meta && law.meta[0]) || '').trim())
);

const missing = allLaws.filter(law => !chunkLinks.has(law.link.trim()));

console.log(`Липсващи scrape-нати закони в chunk файловете: ${missing.length}`);
if (missing.length > 0) {
  console.log('Примери за липсващи:');
  missing.slice(0, 10).forEach(law => console.log(law.link));
} else {
  console.log('ВСИЧКИ scrape-нати закони са налични в chunk файловете!');
}
