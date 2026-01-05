# Dockerfile за Playwright + Node.js scrape
FROM mcr.microsoft.com/playwright:v1.41.1-jammy

WORKDIR /app
COPY . .
RUN npm install

CMD ["node", "scrape_laws_fulltext_playwright.cjs"]
