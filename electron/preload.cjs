const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  searchCovers: (keyword, page) => ipcRenderer.invoke('cover:search', { keyword, page }),
  proxyImage: (url) => ipcRenderer.invoke('image:proxy', url),
  saveCoverFromUrl: (url) => ipcRenderer.invoke('cover:saveFromUrl', url),
  saveCoverDataUrl: (dataUrl) => ipcRenderer.invoke('cover:saveDataUrl', dataUrl),
  uploadCover: () => ipcRenderer.invoke('cover:upload'),
  deleteCover: (file) => ipcRenderer.invoke('cover:delete', file),
  readCovers: (files) => ipcRenderer.invoke('cover:readMany', files),
  openBaiduPage: (keyword) => ipcRenderer.invoke('cover:openBaiduPage', keyword),
  onCoverPicked: (cb) => {
    const handler = (_e, data) => cb(data)
    ipcRenderer.on('cover:picked', handler)
    return () => ipcRenderer.removeListener('cover:picked', handler)
  },
  exportFile: (payload) => ipcRenderer.invoke('file:export', payload),
  importJson: () => ipcRenderer.invoke('file:importJson'),
  platform: process.platform,
  appInfo: () => ipcRenderer.invoke('app:info'),
  openPath: (p) => ipcRenderer.invoke('app:openPath', p),
})
