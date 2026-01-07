// Скрипт за проверка на налични закони в JSON файловете
// Използвай Node.js

const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const chunkFiles = fs.readdirSync(publicDir).filter(f => f.startsWith('all_laws_full_chunk_') && f.endsWith('.json'));

const extractedIDs = new Set();

chunkFiles.forEach(file => {
    const filePath = path.join(publicDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    data.forEach(law => {
        if (law.meta && typeof law.meta === 'string') {
            const match = law.meta.match(/ID\/(\d+)/);
            if (match) extractedIDs.add(match[1]);
        }
    });
});

// TODO: Замени този масив с реалния списък от parliament.bg/laws
const allValidIDs = [
    // "166100", "166101", ...
];

const missingIDs = allValidIDs.filter(id => !extractedIDs.has(id));

console.log('Липсващи закони:', missingIDs);
