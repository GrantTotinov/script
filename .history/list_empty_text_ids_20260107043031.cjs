// Скрипт за извеждане на уникалните meta линкове/ID-та на закони без текст
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const chunkFiles = fs.readdirSync(publicDir).filter(f => f.startsWith('all_laws_full_chunk_') && f.endsWith('.json'));

const emptyMetaLinks = new Set();
const emptyIDs = new Set();

chunkFiles.forEach(file => {
    const filePath = path.join(publicDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    data.forEach(law => {
        if (!law.text || law.text.trim() === '') {
            if (law.meta && typeof law.meta === 'string' && law.meta.includes('ID/')) {
                emptyMetaLinks.add(law.meta);
                const match = law.meta.match(/ID\/(\d+)/);
                if (match) emptyIDs.add(match[1]);
            }
        }
    });
});

console.log('Уникални meta линкове на закони без текст:');
console.log([...emptyMetaLinks]);
console.log('Уникални ID-та на закони без текст:');
console.log([...emptyIDs]);
console.log('Общ брой уникални ID-та:', emptyIDs.size);