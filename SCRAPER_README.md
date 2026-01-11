# Bulgarian Laws Scraper System

A robust, fault-tolerant system for scraping the full text of ALL Bulgarian laws from parliament.bg using Playwright and GitHub Actions parallelization.

## 🚀 Features

- **Fault-Tolerant**: Retry logic with exponential backoff
- **SPA-Ready**: Proper waiting for JavaScript Single Page Application content
- **Memory Efficient**: Handles very long documents without memory issues
- **Resume Capability**: Skip already-processed laws and resume from interruption
- **Parallel Processing**: GitHub Actions matrix strategy for concurrent scraping
- **Rate Limiting**: Configurable delays to avoid server overload
- **Individual File Storage**: Each law saved as separate JSON file
- **Comprehensive Logging**: Detailed progress tracking and failure logging
- **Batch Processing**: Intelligent workload splitting strategies

## 📁 Project Structure

```
.
├── law-scraper.js           # Main Playwright scraper class
├── batch-processor.js       # Batch creation and management
├── scraper-cli.js          # Command-line interface
├── result-aggregator.js    # Results aggregation utility
├── schemas.js              # JSON schemas and validation
├── .github/workflows/
│   └── scrape-laws-parallel.yml  # GitHub Actions workflow
├── public/
│   └── all_laws.json       # Input: All laws metadata
├── scraped_laws/           # Output: Individual law JSON files
├── batches/               # Temporary: Batch files for processing
└── failed_laws.json      # Log: Failed scraping attempts
```

## 🏗 System Architecture

### 1. Input Data Structure

```json
{
  "title": "31/01/2025 Закон за изменение и допълнение на Закона за вероизповеданията",
  "date": "",
  "link": "https://www.parliament.bg/bg/laws/ID/165951"
}
```

### 2. Output Data Structure

```json
{
  "title": "Original law title",
  "date": "Original date",
  "link": "Law URL",
  "lawId": "165951",
  "actualTitle": "Title from law page",
  "metadata": ["Law details array"],
  "fullText": "Complete law text content",
  "textLength": 45678,
  "scrapedAt": "2025-01-11T10:30:00.000Z",
  "isComplete": true,
  "error": null,
  "retryCount": 0
}
```

### 3. Batch Processing Strategies

- **Size-based**: Fixed number of laws per batch
- **Year-based**: Group laws by publication year
- **Equal**: Distribute laws evenly across workers

## 🔧 Local Usage

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npm run install:playwright
# or
npx playwright install --with-deps chromium
```

### Basic Commands

```bash
# Create batches from laws dataset
npm run scraper:create-batches

# Check scraping status
npm run scraper:status

# Scrape all batches locally (sequential)
npm run scraper:scrape-all

# Resume interrupted scraping
npm run scraper:resume

# Clean up temporary files
npm run scraper:cleanup

# Show help
npm run scraper:help
```

### Advanced Configuration

```bash
# Create year-based batches of 50 laws each
BATCH_STRATEGY=year BATCH_SIZE=50 npm run scraper:create-batches

# Run with custom settings
MAX_RETRIES=5 CONCURRENCY=2 DELAY_MS=3000 npm run scraper:scrape-all

# Run in non-headless mode for debugging
HEADLESS=false npm run scraper:scrape-batch 0
```

## ⚙️ Configuration Options

### Environment Variables

| Variable         | Default                | Description                               |
| ---------------- | ---------------------- | ----------------------------------------- |
| `BATCH_SIZE`     | 100                    | Number of laws per batch                  |
| `MAX_RETRIES`    | 3                      | Maximum retry attempts per law            |
| `CONCURRENCY`    | 3                      | Number of concurrent browsers             |
| `DELAY_MS`       | 2000                   | Delay between requests (ms)               |
| `HEADLESS`       | true                   | Run browsers in headless mode             |
| `BATCH_STRATEGY` | size                   | Batch creation strategy (size/year/equal) |
| `INPUT_PATH`     | ./public/all_laws.json | Input laws file                           |
| `OUTPUT_DIR`     | ./scraped_laws         | Output directory                          |
| `BATCH_DIR`      | ./batches              | Batch files directory                     |

### Scraper Options

```javascript
const scraper = new BulgarianLawsScraper({
  headless: true,
  maxRetries: 3,
  pageTimeout: 60000,
  navigationTimeout: 30000,
  selectorTimeout: 15000,
  delayBetweenRequests: 2000,
  concurrency: 3,
  minTextLength: 50,
  maxTextLength: 1000000,
  outputDir: './scraped_laws',
})
```

## 🔄 GitHub Actions Workflow

### Triggering the Workflow

1. **Manual Trigger**: Go to Actions tab → "Scrape Bulgarian Laws (Parallel)" → Run workflow
2. **Scheduled**: Runs automatically every Sunday at 2 AM UTC
3. **Parameters**: Customize batch size, retry count, concurrency, etc.

### Workflow Stages

1. **Create Batches**: Split laws into processing batches
2. **Parallel Scraping**: Process batches concurrently (max 10 workers)
3. **Aggregate Results**: Combine all scraped laws
4. **Generate Reports**: Create summary and statistics

### Artifacts

- `final-scraped-laws`: All successfully scraped laws
- `final-failed-laws`: Log of failed scraping attempts
- `scraped-laws-batch-X`: Individual batch results
- `batch-files`: Batch configuration and splitting data

## 🛠 Technical Implementation Details

### SPA Content Loading Strategy

The scraper uses a three-pronged approach to ensure JavaScript content is fully loaded:

1. **Selector Waiting**: Wait for specific content selectors to appear
2. **Network Idle**: Wait for network activity to stabilize
3. **DOM Stability**: Monitor DOM changes until content stabilizes

### Content Extraction Hierarchy

1. **Primary**: `.act-body` container (most reliable)
2. **Secondary**: `.content .law`, `.law-text`, `.law-content` selectors
3. **Fallback**: Largest text content in any div element

### Retry Logic

- **Exponential Backoff**: Delays increase with each retry (1s, 2s, 4s, 8s, max 10s)
- **Clean Restarts**: Each retry uses a fresh browser instance
- **Error Classification**: Different handling for network vs. content errors

### Memory Management

- **Individual Browsers**: Each law gets its own browser instance
- **Resource Cleanup**: Aggressive cleanup of browsers and pages
- **Text Limits**: 1MB limit on extracted text with truncation
- **Concurrent Control**: Configurable concurrency limits

## 🧪 Testing and Validation

### Local Testing

```bash
# Test single batch (batch 0)
node scraper-cli.js scrape-batch 0

# Test with visual browser for debugging
HEADLESS=false node scraper-cli.js scrape-batch 0

# Validate setup
npm run test:scraper
```

### Content Validation

Each scraped law is validated for:

- Minimum text length (50 characters)
- Maximum text length (1MB limit)
- Presence of law content markers
- Proper encoding and formatting

### Progress Monitoring

```bash
# Check overall status
npm run scraper:status

# View detailed progress
cat scraping_progress.json

# Check failed laws
cat failed_laws.json
```

## 📊 Results and Analytics

### Aggregating Results

```bash
# Aggregate all scraped laws
node result-aggregator.js

# Generate detailed report
node result-aggregator.js report
```

### Statistics Provided

- Total laws processed
- Success/failure rates
- Text length statistics (min/max/average)
- Error breakdown by type
- Processing time metrics

## 🚨 Error Handling and Recovery

### Common Issues and Solutions

**Issue**: Laws with very long content fail to scrape
**Solution**: Increase `pageTimeout` and `maxTextLength` settings

**Issue**: Rate limiting from parliament.bg
**Solution**: Increase `delayBetweenRequests` and reduce `concurrency`

**Issue**: GitHub Actions timeout
**Solution**: Reduce batch size or increase worker count

**Issue**: Network instability
**Solution**: Increase `maxRetries` and `navigationTimeout`

### Recovery Strategies

1. **Resume Capability**: Use `npm run scraper:resume` to continue from where you left off
2. **Individual Retries**: Failed laws are automatically retried with backoff
3. **Batch Independence**: Failed batches don't affect others
4. **Manual Retry**: Re-run specific batches manually

## 🔒 Best Practices

### Rate Limiting

- **Respectful Scraping**: 2-second delays between requests
- **Server Load**: Maximum 10 concurrent workers in GitHub Actions
- **Peak Hours**: Consider running during off-peak hours

### Resource Management

- **Browser Cleanup**: Always close browsers and pages
- **Memory Monitoring**: Watch for memory leaks in long runs
- **Disk Space**: Monitor storage for large datasets

### Quality Assurance

- **Content Validation**: Verify extracted text quality
- **Manual Sampling**: Periodically check random scraped laws
- **Error Analysis**: Review failed laws for patterns

## 🤝 Contributing

### Development Setup

1. Fork the repository
2. Install dependencies: `npm install`
3. Install Playwright: `npm run install:playwright`
4. Make your changes
5. Test locally: `npm run test:scraper`
6. Submit a pull request

### Adding New Features

- **New Extraction Strategies**: Add to `extractLawContent()` method
- **New Batch Strategies**: Extend `BatchProcessor` class
- **Additional Validation**: Update `schemas.js`

## 📝 License and Legal

This scraper is designed for educational and research purposes. Please ensure compliance with:

- Parliament.bg terms of service
- Bulgarian copyright laws
- Respectful usage guidelines
- Academic/research fair use

## 📞 Support

For issues, questions, or contributions:

1. Check existing issues in the repository
2. Create a new issue with detailed description
3. Include logs and configuration details
4. Follow the issue template

---

**Happy Scraping! 🎉**

_Built with ❤️ for Bulgarian legal research and transparency_
