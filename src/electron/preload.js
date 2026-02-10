const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getChannels: () => ipcRenderer.invoke('get-channels'),
  saveChannels: (channels) => ipcRenderer.invoke('save-channels', channels)
})
