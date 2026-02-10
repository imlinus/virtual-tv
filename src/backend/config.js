const fs = require('fs')
const path = require('path')

const CONFIG_DIR = path.join(process.cwd(), 'data')
const CHANNELS_FILE = path.join(CONFIG_DIR, 'channels.json')
const LIBRARY_FILE = path.join(CONFIG_DIR, 'library.json')

if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true })
}

function readChannels () {
  if (!fs.existsSync(CHANNELS_FILE)) return []
  try {
    return JSON.parse(fs.readFileSync(CHANNELS_FILE, 'utf8'))
  } catch (e) {
    return []
  }
}

function writeChannels (channels) {
  fs.writeFileSync(CHANNELS_FILE, JSON.stringify(channels, null, 2))
}

function readLibrary () {
  if (!fs.existsSync(LIBRARY_FILE)) return {}
  try {
    return JSON.parse(fs.readFileSync(LIBRARY_FILE, 'utf8'))
  } catch (e) {
    return {}
  }
}

function writeLibrary (library) {
  fs.writeFileSync(LIBRARY_FILE, JSON.stringify(library, null, 2))
}

module.exports = {
  readChannels,
  writeChannels,
  readLibrary,
  writeLibrary
}
