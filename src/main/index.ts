import { app, BrowserWindow, ipcMain, globalShortcut, screen } from 'electron'
import path from 'path'
import { is } from '@electron-toolkit/utils'
import { MainStore } from './store'
import { registerIPC } from './ipc/handlers'

let mainWindow: BrowserWindow | null = null
const store = new MainStore()

// --- ADD THESE VARIABLES ---
let isMinimized = false
let originalBounds: any = null

// --- ADD THIS IPC LISTENER ---
ipcMain.on('window:toggle-minimize', () => {
  if (!mainWindow) return
  if (!isMinimized) {
    originalBounds = mainWindow.getBounds()
    const [x, y] = mainWindow.getPosition()
    const [w, h] = mainWindow.getSize()
    const centerX = x + w / 2
    const centerY = y + h / 2
    
    const newSize = 104 // 80px ball + 24px shadow margin
    mainWindow.setSize(newSize, newSize)
    mainWindow.setPosition(Math.round(centerX - newSize / 2), Math.round(centerY - newSize / 2))
    
    isMinimized = true
    mainWindow.webContents.send('window:minimized')
  } else {
    if (originalBounds) {
      mainWindow.setBounds(originalBounds)
    } else {
      mainWindow.setSize(424, 624) // Fallback default size
    }
    isMinimized = false
    mainWindow.webContents.send('window:restored')
  }
})

async function createWindow() {
  await store.init()
  const { width: sw } = screen.getPrimaryDisplay().workAreaSize
  const WIN_W = 424, WIN_H = 624, WIN_X = Math.floor((sw - WIN_W) / 2), WIN_Y = 80

  mainWindow = new BrowserWindow({
    width: WIN_W, height: WIN_H, x: WIN_X, y: WIN_Y,
    frame: false, transparent: true, alwaysOnTop: true, level: 'floating',
    skipTaskbar: true, resizable: false, thickFrame: false, hasShadow: false,
    webPreferences: {
      // ✅ Dynamic preload path that works in dev and prod
      preload: is.dev 
        ? path.join(__dirname, '../../out/preload/index.mjs')
        : path.join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      sandbox: false
    }
  })

  mainWindow.on('close', (e) => { if (!app.isQuitting) { e.preventDefault(); mainWindow?.hide() } })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  registerIPC(store, mainWindow)
}

app.whenReady().then(async () => {
  await createWindow()
  globalShortcut.register('Alt+Space', () => { 
    if (!mainWindow) return
    mainWindow.isVisible() ? mainWindow.hide() : (mainWindow.show(), mainWindow.focus()) 
  })
  globalShortcut.register('Alt+F', () => mainWindow?.webContents.send('view:open', 'focus'))
  globalShortcut.register('Alt+Z', () => mainWindow?.webContents.send('view:open', 'zen'))
})

app.on('before-quit', () => { app.isQuitting = true })
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
