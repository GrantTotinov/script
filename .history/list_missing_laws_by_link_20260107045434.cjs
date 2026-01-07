// Скрипт за сравнение на "link" от all_laws.json с "meta" от chunk файловете
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const chunkFiles = fs.readdirSync(publicDir).filter(f => f.startsWith('all_laws_full_chunk_') && f.endsWith('.json'));

// 1. Събиране на всички meta линкове от chunk файловете
const chunkLinks = new Set();
chunkFiles.forEach(file => {
    const filePath = path.join(publicDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    data.forEach(law => {
        if (law.meta && typeof law.meta === 'string') {
            chunkLinks.add(law.meta);
        }
    });
});

// 2. Събиране на всички закони от all_laws.json, които ги няма в chunk файловете
const allLawsPath = path.join(publicDir, 'all_laws.json');
const allLaws = JSON.parse(fs.readFileSync(allLawsPath, 'utf8'));
const missingLaws = [];
allLaws.forEach(law => {
    if (law.link && typeof law.link === 'string' && !chunkLinks.has(law.link)) {
        missingLaws.push(law);
    }
});

console.log('Закони, които ги има в all_laws.json (link), но ги няма в chunk файловете (meta):');
console.log(missingLaws);
console.log('Общ брой липсващи:', missingLaws.length);
