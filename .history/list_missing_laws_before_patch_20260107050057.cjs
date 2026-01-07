// list_missing_laws_before_patch.cjs
// Извежда scrape-натите закони от all_laws.json, които липсваха в chunk файловете ПРЕДИ автоматичното допълване

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

const result = missing.map(law => ({
  title: law.title,
  link: law.link
}));

fs.writeFileSync(path.join(__dirname, 'missing_laws_before_patch.json'), JSON.stringify(result, null, 2), 'utf8');
console.log(`Записани са ${result.length} липсващи scrape-нати закона в missing_laws_before_patch.json`);
