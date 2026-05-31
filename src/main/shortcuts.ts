import { globalShortcut, app, BrowserWindow } from 'electron'

export function registerShortcuts(windows: {
  command: BrowserWindow
  full: BrowserWindow
  hud: BrowserWindow
}): void {
  // Toggle command palette
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    if (windows.command.isVisible()) {
      windows.command.hide()
    } else {
      windows.command.show()
      windows.command.focus()
      windows.command.webContents.send('command:focusInput')
    }
  })

  // Toggle full app
  globalShortcut.register('CommandOrControl+Shift+Z', () => {
    if (windows.full.isVisible()) {
      windows.full.hide()
    } else {
      windows.full.show()
      windows.full.focus()
    }
  })

  // Quick stop timer
  globalShortcut.register('CommandOrControl+Shift+S', () => {
    windows.hud.webContents.send('hud:quickStop')
  })

  app.on('will-quit', () => {
    globalShortcut.unregisterAll()
  })
}
