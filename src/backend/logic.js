const { readChannels, readLibrary } = require('./config')

function getCurrentPlaying (channelId) {
  const channels = readChannels()
  const library = readLibrary()

  const channel = channels.find(c => c.id === channelId)
  if (!channel) return null

  // Pool all episodes
  const pool = []
  for (const showPath of channel.shows) {
    if (library[showPath]) {
      for (const ep of library[showPath]) {
        pool.push({
          show: path.basename(showPath),
          ...ep
        })
      }
    }
  }

  if (pool.length === 0) return null

  // Sort by path for consistency
  pool.sort((a, b) => a.path.localeCompare(b.path))

  const totalDuration = pool.reduce((sum, ep) => sum + (ep.duration || 1320), 0)
  if (totalDuration === 0) return null

  const now = Math.floor(Date.now() / 1000)
  const currentTimeOffset = now % totalDuration

  let runningSum = 0
  let current = pool[0]
  let elapsed = 0

  for (const ep of pool) {
    const epDuration = ep.duration || 1320
    if (currentTimeOffset >= runningSum && currentTimeOffset < (runningSum + epDuration)) {
      current = ep
      elapsed = currentTimeOffset - runningSum
      break
    }
    runningSum += epDuration
  }

  return {
    episode: current,
    channel: channel.name,
    channelId: channelId,
    elapsed: elapsed,
    total: current.duration || 1320,
    nextIn: (current.duration || 1320) - elapsed,
    poolSize: pool.length
  }
}

const path = require('path') // Required for path.basename

module.exports = {
  getCurrentPlaying
}
