/* global fetch, alert, HTMLElement, cast, chrome */

let currentChannel = null
let currentEpisode = null
let updateTimer = null
let overlayTimer = null
let channels = []

async function init () {
  setupModal()
  setupOverlay()
  setupCast()
  setupMute()
  await loadChannels()
  
  // Fetch system info for diagnostics
  fetch('/api/info').then(r => r.json()).then(data => {
    window.systemInfo = data
    console.log('[System] Live at:', data.ip)
  })
}

function setupMute () {
  const muteBtn = document.getElementById('mute-btn')
  const muteIcon = document.getElementById('mute-icon')
  const player = document.getElementById('tv-player')
  
  muteBtn.onclick = () => {
    player.muted = !player.muted
    if (player.muted) {
      muteIcon.className = 'ph-bold ph-speaker-slash'
    } else {
      muteIcon.className = 'ph-bold ph-speaker-high'
    }
  }
}

function setupOverlay () {
  const overlay = document.getElementById('tv-overlay')
  const container = document.getElementById('tv-container')
  
  const showOverlay = () => {
    overlay.classList.add('is-active')
    clearTimeout(overlayTimer)
    overlayTimer = setTimeout(() => overlay.classList.remove('is-active'), 8000)
  }
  
  container.onmousemove = showOverlay
  container.onclick = showOverlay
  showOverlay()
}

function setupCast () {
  const castBtn = document.getElementById('cast-btn')
  
  // Update button color if session is active
  setInterval(() => {
    if (window.cast && cast.framework) {
      const context = cast.framework.CastContext.getInstance()
      const session = context.getCurrentSession()
      castBtn.style.color = session ? 'var(--accent)' : 'white'
    }
  }, 2000)

  castBtn.onclick = async () => {
    console.log('[Cast] Button clicked');
    
    // Check for storage access error
    try {
      localStorage.getItem('test');
    } catch (e) {
      alert('Chromecast is BLOCKED by your browser settings.\n\nYour browser is denying storage access (likely because third-party cookies are blocked for this IP). Google Cast SDK requires storage to function.\n\nPlease check your Privacy settings and allow cookies for this site.');
      return;
    }

    if (!window.castReady) {
      let msg = 'Chromecast SDK is not ready yet.';
      if (window.castError) {
        msg += `\n\nError: ${window.castError}`;
        if (window.castError.includes('storage')) {
          msg += '\n\nFix: Your browser is blocking storage/cookies. Allow them for this site (or turn off Incognito) to use Chromecast.';
        } else if (window.castError.includes('extension')) {
          msg += '\n\nFix: Ensure the Google Cast extension is enabled and your browser supports Casting.';
        }
      } else {
        msg += '\n\nIf the button never loads, please check your internet connection to gstatic.com.';
      }
      alert(msg);
      return;
    }
    
    if (!currentEpisode) {
      alert('Wait for a channel to start playing before casting!');
      return;
    }

    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      const networkIP = window.systemInfo?.ip || 'YOUR_IP';
      const confirmCast = confirm(`⚠️ Warning: You are on "localhost".\n\nChromecast devices cannot see your "localhost". You MUST access this app via your Network IP for casting to work.\n\nTry opening: http://${networkIP}:9210\n\nContinue anyway?`);
      if (!confirmCast) return;
    }

    const context = cast.framework.CastContext.getInstance()
    let session = context.getCurrentSession()
    
    if (!session) {
      try {
        console.log('[Cast] Requesting session...');
        await context.requestSession()
        session = context.getCurrentSession()
      } catch (e) {
        console.error('[Cast] Session Request Error:', e)
        return
      }
    }
    
    if (session) {
      syncToCast()
    }
  }
}

function syncToCast () {
  const context = cast.framework.CastContext.getInstance()
  const session = context.getCurrentSession()
  if (!session || !currentEpisode) return

  // Detect MIME type based on extension
  const ext = currentEpisode.path.split('.').pop().toLowerCase()
  let mimeType = 'video/mp4' // default
  if (ext === 'mkv') mimeType = 'video/x-matroska'
  if (ext === 'webm') mimeType = 'video/webm'
  if (ext === 'mov') mimeType = 'video/quicktime'
  if (ext === 'avi') mimeType = 'video/x-msvideo'

  const mediaUrl = `${window.location.origin}/video?path=${encodeURIComponent(currentEpisode.path)}`
  console.log(`[Cast] Starting stream: ${mediaUrl} (${mimeType})`)

  const mediaInfo = new chrome.cast.media.MediaInfo(mediaUrl, mimeType)
  mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata()
  mediaInfo.metadata.title = currentEpisode.name
  mediaInfo.metadata.subtitle = currentEpisode.show
  
  const request = new chrome.cast.media.LoadRequest(mediaInfo)
  
  // Get fresh status to sync exact time
  fetch(`/api/status?channel=${currentChannel}`).then(r => r.json()).then(data => {
    request.currentTime = data.elapsed
    console.log(`[Cast] Seeking to: ${data.elapsed}s`)
    
    session.loadMedia(request).then(
      () => {
        console.log('[Cast] Load success')
        // Force the progress bar to show we are casting
        document.getElementById('cast-btn').classList.add('is-active')
      },
      (err) => {
        console.error('[Cast] Load failure', err)
        alert('Chromecast failed to load this video. Format might be incompatible.')
      }
    )
  }).catch(e => console.error('[Cast] Failed to fetch sync data', e))
}

function setupModal () {
  const modal = document.getElementById('manage-modal')
  const btn = document.getElementById('manage-btn')
  const close = document.querySelector('.close-btn')
  
  btn.onclick = () => {
    renderManageList()
    modal.classList.add('is-visible')
  }
  
  close.onclick = () => {
    modal.classList.remove('is-visible')
  }
  
  window.onclick = (event) => {
    if (event.target === modal) {
      modal.classList.remove('is-visible')
    }
  }

  document.getElementById('save-channel-btn').onclick = addChannel
  document.getElementById('browse-btn').onclick = () => browseFolder()
}

async function browseFolder (path = '/home/linus') {
  const browser = document.getElementById('folder-browser')
  browser.classList.add('is-visible')
  
  try {
    const res = await fetch(`/api/browse?path=${encodeURIComponent(path)}`)
    const data = await res.json()
    
    browser.innerHTML = ''
    
    // Parent dir
    const parent = document.createElement('div')
    parent.className = 'browser-item is-parent'
    parent.innerHTML = '📁 .. (Up)'
    parent.onclick = () => browseFolder(data.parent)
    browser.appendChild(parent)
    
    data.directories.forEach(dir => {
      const item = document.createElement('div')
      item.className = 'browser-item'
      item.innerHTML = `📁 ${dir.name}`
      item.onclick = (e) => {
        e.stopPropagation()
        browseFolder(dir.path)
        document.getElementById('new-channel-folder').value = dir.path
      }
      browser.appendChild(item)
    })
  } catch (e) {
    console.error('Browse error', e)
  }
}

async function loadChannels () {
  const res = await fetch('/api/channels')
  const data = await res.json()
  channels = data
  const list = document.getElementById('channel-list')
  list.innerHTML = ''
  
  channels.forEach(channel => {
    const card = document.createElement('div')
    card.className = 'channel-card'
    if (currentChannel === channel.id) card.classList.add('is-active')
    
    card.innerHTML = `
      <h3>${channel.name}</h3>
      <div class="meta">${channel.shows.length} Source Folder(s)</div>
    `
    card.onclick = () => selectChannel(channel.id, card)
    list.appendChild(card)
  })

  if (!currentChannel && channels.length > 0) {
    const firstCard = list.querySelector('.channel-card')
    selectChannel(channels[0].id, firstCard)
  }
}

function renderManageList () {
  const list = document.getElementById('manage-channel-list')
  list.innerHTML = ''
  
  channels.forEach((channel, index) => {
    const item = document.createElement('div')
    item.className = 'manage-item'
    item.innerHTML = `
      <span>${channel.name}</span>
      <button class="delete-btn" onclick="removeChannel(${index})">Delete</button>
    `
    list.appendChild(item)
  })
}

async function addChannel () {
  const name = document.getElementById('new-channel-name').value
  const folder = document.getElementById('new-channel-folder').value
  const btn = document.getElementById('save-channel-btn')
  
  if (!name || !folder) return alert('Name and folder are required')
  
  // Disable button while loading
  btn.disabled = true
  btn.textContent = 'Creating...'
  btn.style.opacity = '0.5'
  
  const id = name.toLowerCase().replace(/\s+/g, '-')
  channels.push({ id, name, shows: [folder] })
  
  try {
    await saveChannels()
    document.getElementById('new-channel-name').value = ''
    document.getElementById('new-channel-folder').value = ''
    await loadChannels()
    renderManageList()
  } catch (e) {
    alert('Failed to create channel')
  } finally {
    btn.disabled = false
    btn.textContent = 'Create Channel'
    btn.style.opacity = '1'
  }
}

async function removeChannel (index) {
  if (!confirm('Are you sure you want to delete this channel?')) return
  channels.splice(index, 1)
  await saveChannels()
  loadChannels()
  renderManageList()
}

async function saveChannels () {
  await fetch('/api/channels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(channels)
  })
}

async function selectChannel (id, element) {
  document.querySelectorAll('.channel-card').forEach(c => c.classList.remove('is-active'))
  if (element) element.classList.add('is-active')
  
  currentChannel = id
  currentEpisode = null // Reset to force reload
  await updateStatus()
}

async function updateStatus () {
  if (!currentChannel) return
  
  try {
    const res = await fetch(`/api/status?channel=${currentChannel}`)
    const data = await res.json()
    
    if (!data) {
      document.getElementById('episode-name').textContent = 'No media found'
      document.getElementById('show-name').textContent = 'Add some folders in Manage'
      return
    }
    
    // Check if episode changed
    if (!currentEpisode || currentEpisode.path !== data.episode.path) {
      currentEpisode = data.episode
      playVideo(data.episode, data.elapsed)
      
      // If casting, sync it too
      if (window.cast && cast.framework && cast.framework.CastContext.getInstance().getCurrentSession()) {
        syncToCast()
      }
    }
    
    // UI Update
    document.getElementById('episode-name').textContent = data.episode.show
    document.getElementById('show-name').textContent = data.episode.name
    document.getElementById('channel-name-label').textContent = `Channel: ${data.channel}`
    
    const progress = (data.elapsed / data.total) * 100
    document.getElementById('progress-bar').style.width = `${progress}%`
    
    clearTimeout(updateTimer)
    updateTimer = setTimeout(updateStatus, 1000)
    
  } catch (e) {
    console.error('Status Error', e)
  }
}

function playVideo (episode, elapsed) {
  const player = document.getElementById('tv-player')
  const videoUrl = `/video?path=${encodeURIComponent(episode.path)}`
  
  player.src = videoUrl
  player.currentTime = elapsed
  player.play().catch(e => console.log('Autoplay blocked', e))
}

init()
