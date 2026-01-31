const { contextBridge, ipcRenderer } = require('electron')

// Exposer l'API IPC au renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Fonction pour faire des requêtes API via IPC (cookie = cookies du renderer pour l'auth)
  request: (path, method = 'GET', body, cookie = '') => {
    return ipcRenderer.invoke('api-request', { path, method, body, cookie })
  }
})
