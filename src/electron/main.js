const { app, Tray, Menu, BrowserWindow, ipcMain, dialog, shell } = require('electron')
app.disableHardwareAcceleration()

const path = require('path')
const { fork } = require('child_process')
const { readChannels, writeChannels } = require('../backend/config')

let tray = null
let panelWindow = null
let serverProcess = null

function createServer () {
  console.log('Starting backend server...')
  // Start the backend server
  serverProcess = fork(path.join(__dirname, '../backend/server.js'))
  
  serverProcess.on('error', (err) => {
    console.error('Failed to start server process:', err)
  })

  serverProcess.on('message', (msg) => {
    console.log('Server:', msg)
  })
}

function createPanel () {
  panelWindow = new BrowserWindow({
    width: 350,
    height: 450,
    show: false,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  panelWindow.loadFile(path.join(__dirname, 'panel.html'))

  panelWindow.on('blur', () => {
    panelWindow.hide()
  })
}

function togglePanel () {
  if (panelWindow.isVisible()) {
    panelWindow.hide()
  } else {
    const trayBounds = tray.getBounds()
    const x = Math.round(trayBounds.x + (trayBounds.width / 2) - (350 / 2))
    const y = Math.round(trayBounds.y + trayBounds.height + 4)
    
    panelWindow.setPosition(x, y, false)
    panelWindow.show()
    panelWindow.focus()
  }
}

app.whenReady().then(() => {
  console.log('App is ready')
  createServer()
  createPanel()

  const iconPath = path.join(__dirname, '../../assets/icon.png')
  console.log('Creating tray with icon:', iconPath)
  
  try {
    tray = new Tray(iconPath)
    
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Open TV', click: () => shell.openExternal('http://localhost:9210') },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ])

    tray.setToolTip('Virtual TV')
    tray.on('click', () => {
      togglePanel()
    })
    tray.setContextMenu(contextMenu)
    console.log('Tray created successfully')
  } catch (e) {
    console.error('Failed to create tray:', e)
  }

  // Debug: Show a simple window to confirm Electron is working
  const debugWin = new BrowserWindow({ width: 400, height: 200 })
  debugWin.loadURL('data:text/html,<h1>Virtual TV Electron is running</h1><p>Check your system tray for the icon.</p>')
})

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(panelWindow, {
    properties: ['openDirectory']
  })
  return result.filePaths[0]
})

ipcMain.handle('get-channels', () => {
  return readChannels()
})

ipcMain.handle('save-channels', (event, channels) => {
  writeChannels(channels)
  // Optionally tell the server to reload or scan
  return { success: true }
})

app.on('window-all-closed', () => {
  // Keep app running in tray
})

app.on('quit', () => {
  if (serverProcess) serverProcess.kill()
})
