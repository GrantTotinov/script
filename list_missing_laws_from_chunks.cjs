// Скрипт за извеждане на всички закони, които ги има в all_laws.json, но ги няма в chunk файловете
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const chunkFiles = fs.readdirSync(publicDir).filter(f => f.startsWith('all_laws_full_chunk_') && f.endsWith('.json'));

// 1. Събиране на всички ID-та от chunk файловете
const chunkIDs = new Set();
chunkFiles.forEach(file => {
    const filePath = path.join(publicDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    data.forEach(law => {
        if (law.meta && typeof law.meta === 'string') {
            const match = law.meta.match(/ID\/(\d+)/);
            if (match) chunkIDs.add(match[1]);
        }
    });
});

// 2. Събиране на всички закони от all_laws.json
const allLawsPath = path.join(publicDir, 'all_laws.json');
const allLaws = JSON.parse(fs.readFileSync(allLawsPath, 'utf8'));
const missingLaws = [];
allLaws.forEach(law => {
    if (law.meta && typeof law.meta === 'string') {
        const match = law.meta.match(/ID\/(\d+)/);
        if (match && !chunkIDs.has(match[1])) {
            missingLaws.push(law);
        }
    }
});

console.log('Закони, които ги има в all_laws.json, но ги няма в chunk файловете:');
console.log(missingLaws);
console.log('Общ брой липсващи:', missingLaws.length);
