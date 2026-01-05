// Simple Express server to proxy laws from parliament.bg
// Run: node server.cjs

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const express = require('express')
const https = require('https')
const app = express()
const PORT = 3001

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173')
  res.header('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

app.get('/api/laws', (req, res) => {
  const options = {
    hostname: 'www.parliament.bg',
    path: '/api/v1/front-act-list',
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Referer: 'https://www.parliament.bg/',
    },
  }
  const proxyReq = https.request(options, (proxyRes) => {
    let data = ''
    proxyRes.on('data', (chunk) => {
      data += chunk
    })
    proxyRes.on('end', () => {
      try {
        const json = JSON.parse(data)
        res.json(json) // Return the full JSON, including laws
      } catch (e) {
        res.status(502).send('Invalid JSON from parliament.bg: ' + data)
      }
    })
  })
  proxyReq.on('error', (e) => {
    res.status(500).send('Proxy error: ' + e)
  })
  proxyReq.end()
})

app.listen(PORT, () => {
  console.log(`Proxy server running at http://localhost:${PORT}/api/laws`)
})
