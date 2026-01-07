// Скрипт за сравнение на всички scrape-нати закони с chunk файловете
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

// 2. Събиране на всички ID-та от all_laws.json
const allLawsPath = path.join(publicDir, 'all_laws.json');
const allLaws = JSON.parse(fs.readFileSync(allLawsPath, 'utf8'));
const allIDs = new Set();
allLaws.forEach(law => {
    if (law.meta && typeof law.meta === 'string') {
        const match = law.meta.match(/ID\/(\d+)/);
        if (match) allIDs.add(match[1]);
    }
});

// 3. Сравнение и извеждане на липсващите
const missing = [...allIDs].filter(id => !chunkIDs.has(id));
console.log('Липсващи закони (ID-та):', missing);
console.log('Общ брой липсващи:', missing.length);
