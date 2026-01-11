# How to Run the Scraper in the Cloud (GitHub Actions)

## 1. Push Your Code to GitHub

- Create a new private repository on GitHub (recommended for privacy).
- Push your entire project folder (including .github/workflows/scrape-laws.yml, all scripts, and all_laws.json) to the repository.

## 2. Trigger the Scraping Workflow

- Go to the "Actions" tab in your GitHub repository.
- Find the workflow named **Scrape Laws in Parallel**.
- Click **Run workflow** (top right) and confirm. This will start 10 parallel jobs.

## 3. Wait for Completion

- Each job will scrape a chunk of laws and upload a result file (laws-chunk-0, laws-chunk-1, ...).
- Wait until all jobs are green (completed).

## 4. Download the Results

- For each job, click on it and find the **Artifacts** section at the bottom.
- Download all 10 `laws-chunk-*.json` files.
- (Optional) Merge them locally into a single file if needed.

## 5. (Optional) Merge Results

You can use a simple Node.js script to merge all chunk files:

```js
const fs = require('fs')
const files = [
  'scraped_laws_chunk_0.json',
  'scraped_laws_chunk_1.json',
  // ... up to 9
]
let all = []
for (const f of files) {
  all = all.concat(JSON.parse(fs.readFileSync(f, 'utf-8')))
}
fs.writeFileSync('all_scraped_laws.json', JSON.stringify(all, null, 2))
```

---

**You now have a fully automated, parallel, free, cloud scraping setup using GitHub Actions!**

If you need to re-run, just trigger the workflow again.
