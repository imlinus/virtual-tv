const http = require('http')
const fs = require('fs')
const path = require('path')
const { readChannels, writeChannels, readLibrary } = require('./config')
const { fullScan } = require('./scanner')
const { getCurrentPlaying } = require('./logic')

const PORT = 9210

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.mp4': 'video/mp4',
  '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm'
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const pathname = url.pathname

  // Basic favicon handler to prevent 404 noise
  if (pathname === '/favicon.ico') {
    res.writeHead(204)
    return res.end()
  }

  // Add CORS for Chromecast
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type')
  res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges, Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    return res.end()
  }

  // API Routes
  if (pathname === '/api/status') {
    const channelId = url.searchParams.get('channel')
    if (channelId) {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify(getCurrentPlaying(channelId)))
    } else {
      const channels = readChannels()
      const statuses = {}
      for (const c of channels) {
        statuses[c.id] = getCurrentPlaying(c.id)
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify(statuses))
    }
  }

  if (pathname === '/api/channels' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify(readChannels()))
  }

  if (pathname === '/api/channels' && req.method === 'POST') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      const channels = JSON.parse(body)
      writeChannels(channels)
      const allShows = [...new Set(channels.flatMap(c => c.shows))]
      fullScan(allShows)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ success: true }))
    })
    return
  }

  if (pathname === '/api/browse' && req.method === 'GET') {
    const browsePath = url.searchParams.get('path') || '/'
    try {
      if (!fs.existsSync(browsePath)) {
        res.writeHead(404)
        return res.end(JSON.stringify({ error: 'Path not found' }))
      }
      const files = fs.readdirSync(browsePath, { withFileTypes: true })
      const dirs = files
        .filter(f => f.isDirectory())
        .map(f => ({ name: f.name, path: path.join(browsePath, f.name) }))
      
      res.writeHead(200, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({
        current: browsePath,
        parent: path.dirname(browsePath),
        directories: dirs
      }))
    } catch (e) {
      res.writeHead(500)
      return res.end(JSON.stringify({ error: e.message }))
    }
  }

  if (pathname === '/api/info' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ ip: getLocalIP(), port: PORT }))
  }

  if (pathname === '/api/scan' && req.method === 'POST') {
    const channels = readChannels()
    const allShows = [...new Set(channels.flatMap(c => c.shows))]
    fullScan(allShows)
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ success: true }))
  }

  if (pathname === '/video') {
    const filePath = url.searchParams.get('path')
    if (!filePath || !fs.existsSync(filePath)) {
      res.writeHead(404)
      return res.end('File not found')
    }

    const stat = fs.statSync(filePath)
    const range = req.headers.range
    const contentType = MIME_TYPES[path.extname(filePath)] || 'application/octet-stream'

    // Always signal we accept ranges
    res.setHeader('Accept-Ranges', 'bytes')

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1
      const chunkSize = (end - start) + 1
      const file = fs.createReadStream(filePath, { start, end })
      const head = {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Content-Length': chunkSize,
        'Content-Type': contentType
      }
      res.writeHead(206, head)
      file.pipe(res)
    } else {
      const head = {
        'Content-Length': stat.size,
        'Content-Type': contentType
      }
      res.writeHead(200, head)
      fs.createReadStream(filePath).pipe(res)
    }
    return
  }

  // Static Files
  let filePath = path.join(__dirname, '../frontend', pathname === '/' ? 'index.html' : pathname)
  const ext = path.extname(filePath)
  const contentType = MIME_TYPES[ext] || 'application/octet-stream'

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404)
        res.end('Not found')
      } else {
        res.writeHead(500)
        res.end('Server error')
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType })
      res.end(content, 'utf-8')
    }
  })
})

const os = require('os')

function getLocalIP () {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return 'localhost'
}

server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP()
  console.log(`\n📺 Virtual TV is live!`)
  console.log(`🚀 Local: http://localhost:${PORT}`)
  console.log(`📡 Network: http://${ip}:${PORT}`)
  console.log(`\n(Use the Network URL for Chromecast to work correctly)\n`)
})
