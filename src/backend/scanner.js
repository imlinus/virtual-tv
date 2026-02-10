const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const { readLibrary, writeLibrary } = require('./config')

const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.webm']

function getVideoDuration (filePath) {
  try {
    const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
    const output = execSync(cmd).toString().trim()
    return isNaN(parseFloat(output)) ? null : parseFloat(output)
  } catch (e) {
    return null
  }
}

function scanFolder (dir, library) {
  const files = fs.readdirSync(dir)
  const results = []

  for (const file of files) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      results.push(...scanFolder(fullPath, library))
    } else {
      const ext = path.extname(file).toLowerCase()
      if (VIDEO_EXTENSIONS.includes(ext)) {
        // Check if we already have it in library and have duration
        let duration = null
        // Flattened lookup in library for performance? 
        // For simplicity, we'll just search.
        for (const showPath in library) {
          const found = library[showPath].find(ep => ep.path === fullPath)
          if (found && found.duration) {
            duration = found.duration
            break
          }
        }

        if (!duration) {
          console.log(`Probing duration for ${fullPath}...`)
          duration = getVideoDuration(fullPath)
        }

        results.push({
          name: file,
          path: fullPath,
          duration: duration || 22 * 60 // Fallback to 22 mins
        })
      }
    }
  }
  return results
}

function fullScan (shows) {
  const library = readLibrary()
  const newLibrary = {}

  for (const showPath of shows) {
    if (fs.existsSync(showPath)) {
      console.log(`Scanning ${showPath}...`)
      newLibrary[showPath] = scanFolder(showPath, library)
    }
  }

  writeLibrary(newLibrary)
  return newLibrary
}

module.exports = {
  fullScan
}
