// split_missing_laws_batches.cjs
// Разделя missing_laws_before_patch.json на N части за паралелен scrape в GitHub Actions

const fs = require('fs');
const path = require('path');

const INPUT = path.join(__dirname, 'missing_laws_before_patch.json');
const OUTDIR = path.join(__dirname, 'public');
const BATCHES = 10; // Може да се променя според matrix в YML

const all = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
const batchSize = Math.ceil(all.length / BATCHES);

for (let i = 0; i < BATCHES; i++) {
  const batch = all.slice(i * batchSize, (i + 1) * batchSize);
  fs.writeFileSync(path.join(OUTDIR, `missing_laws_batch_${i}.json`), JSON.stringify(batch, null, 2), 'utf8');
  console.log(`Batch ${i}: ${batch.length} закона`);
}
