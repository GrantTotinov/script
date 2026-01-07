// scrape_missing_laws_master.cjs
// Главен процес: разпределя scrape задачите между няколко worker процеса
// Всеки worker scrape-ва batch-ово с няколко браузъра

const { fork } = require('child_process');
const fs = require('fs');
const path = require('path');

const missingPath = path.join(__dirname, 'missing_laws_before_patch.json');
const outputChunkPath = path.join(__dirname, 'public', 'all_laws_scraped_missing_chunk.json');
const errorLogPath = path.join(__dirname, 'scrape_errors_log.json');
const workerPath = path.join(__dirname, 'scrape_missing_laws_worker.cjs');

const NUM_WORKERS = 4; // Брой паралелни процеса
const BATCH_PER_WORKER = 5; // Брой браузъра (batch scrape) на worker

async function main() {
  const missingLaws = JSON.parse(fs.readFileSync(missingPath, 'utf8'));
  const chunkSize = Math.ceil(missingLaws.length / NUM_WORKERS);
  const workers = [];
  let finished = 0;
  let allResults = [];
  let allErrors = [];

  for (let i = 0; i < NUM_WORKERS; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, missingLaws.length);
    const lawsSlice = missingLaws.slice(start, end);
    if (lawsSlice.length === 0) continue;
    const worker = fork(workerPath);
    workers.push(worker);
    worker.send({ laws: lawsSlice, batchSize: BATCH_PER_WORKER });
    worker.on('message', ({ results, errors }) => {
      allResults = allResults.concat(results);
      allErrors = allErrors.concat(errors);
      finished++;
      if (finished === workers.length) {
        fs.writeFileSync(outputChunkPath, JSON.stringify(allResults, null, 2), 'utf8');
        fs.writeFileSync(errorLogPath, JSON.stringify(allErrors, null, 2), 'utf8');
        console.log(`Всички scrape-нати: ${allResults.length}, грешки: ${allErrors.length}`);
        process.exit(0);
      }
    });
  }
}

main();
