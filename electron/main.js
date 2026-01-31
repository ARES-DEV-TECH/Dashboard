const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron')
const { spawn } = require('child_process')
const path = require('path')
const isDev = process.env.NODE_ENV === 'development'

let nextServer
let mainWindow

// Optimisations pour Electron
app.commandLine.appendSwitch('--disable-gpu-sandbox')
app.commandLine.appendSwitch('--disable-software-rasterizer')
app.commandLine.appendSwitch('--disable-background-timer-throttling')
app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows')
app.commandLine.appendSwitch('--disable-renderer-backgrounding')
// Permettre les requêtes vers localhost
app.commandLine.appendSwitch('--disable-web-security')
app.commandLine.appendSwitch('--disable-features', 'VizDisplayCompositor')

function createWindow() {
  // Créer la fenêtre du navigateur
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: false, // Désactiver pour permettre les requêtes vers localhost
      allowRunningInsecureContent: true, // Permettre le contenu non sécurisé
      preload: path.join(__dirname, 'preload.js'), // Script preload pour l'IPC
      // Optimisations de performance
      backgroundThrottling: false,
      offscreen: false,
      experimentalFeatures: true
    },
    icon: path.join(__dirname, '../public/icon.png'),
    titleBarStyle: 'hiddenInset',
    show: false,
    // Optimisations de performance
    frame: true,
    transparent: false,
    hasShadow: true
  })

  // Charger l'application
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000')
  } else {
    // En production, démarrer le serveur Next.js
    nextServer = spawn('node', ['node_modules/.bin/next', 'start'], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, PORT: '3000' }
    })
    
    nextServer.stdout.on('data', (data) => {
      console.log(`Next.js: ${data}`)
    })
    
    nextServer.stderr.on('data', (data) => {
      console.error(`Next.js error: ${data}`)
    })
    
    // Attendre que le serveur soit prêt
    setTimeout(() => {
      mainWindow.loadURL('http://localhost:3000')
    }, 5000)
  }

  // Afficher la fenêtre quand prête
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    
    // Ouvrir les DevTools en développement
    if (isDev) {
      mainWindow.webContents.openDevTools()
    }
  })

  // Gérer la fermeture de fenêtre
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Ouvrir les liens externes dans le navigateur
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

// Menu de l'application (macOS)
function createMenu() {
  const template = [
    {
      label: 'ARES Dashboard',
      submenu: [
        {
          label: 'À propos d\'ARES Dashboard',
          role: 'about'
        },
        { type: 'separator' },
        {
          label: 'Préférences...',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            // Ouvrir les paramètres
            mainWindow.webContents.send('open-settings')
          }
        },
        { type: 'separator' },
        {
          label: 'Quitter',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit()
          }
        }
      ]
    },
    {
      label: 'Édition',
      submenu: [
        { label: 'Annuler', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Refaire', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Couper', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copier', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Coller', accelerator: 'CmdOrCtrl+V', role: 'paste' }
      ]
    },
    {
      label: 'Affichage',
      submenu: [
        { label: 'Recharger', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Forcer le rechargement', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: 'Outils de développement', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Zoom avant', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: 'Zoom arrière', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { label: 'Zoom par défaut', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Plein écran', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Fenêtre',
      submenu: [
        { label: 'Réduire', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { label: 'Fermer', accelerator: 'CmdOrCtrl+W', role: 'close' }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// Handlers IPC pour les requêtes API (cookie = cookies du renderer pour transmettre l'auth)
ipcMain.handle('api-request', async (event, { path, method = 'GET', body, cookie = '' }) => {
  try {
    const url = `http://localhost:3000${path}`
    const headers = {
      'Content-Type': 'application/json',
    }
    if (cookie && typeof cookie === 'string') {
      headers['Cookie'] = cookie
    }
    const response = await fetch(url, {
      method,
      headers,
      body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    })
    
    console.log('IPC response:', response.status, response.statusText)
    
    if (!response.ok) {
      // Récupérer le contenu de l'erreur
      const errorData = await response.json()
      console.log('IPC error data:', errorData)
      return { success: false, error: errorData.message || `HTTP error! status: ${response.status}` }
    }
    
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error('Erreur API:', error)
    return { success: false, error: error.message }
  }
})

// Gestionnaires d'événements de l'application
app.whenReady().then(() => {
  createWindow()
  createMenu()

  app.on('activate', () => {
    // Sur macOS, recréer la fenêtre quand l'icône du dock est cliquée
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Quitter quand toutes les fenêtres sont fermées (sauf sur macOS)
app.on('window-all-closed', () => {
  if (nextServer) {
    nextServer.kill()
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Gestion des mises à jour automatiques (optionnel)
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault()
    shell.openExternal(navigationUrl)
  })
})

// Gestion des erreurs
process.on('uncaughtException', (error) => {
  console.error('Erreur non gérée:', error)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promesse rejetée non gérée:', reason)
})
