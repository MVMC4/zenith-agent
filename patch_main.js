const fs = require('fs');
const file = 'src/main/index.ts';
let code = fs.readFileSync(file, 'utf8');

const injection = `
  let isMinimized = false
  let originalBounds: any = null

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
        mainWindow.setSize(424, 624)
      }
      isMinimized = false
      mainWindow.webContents.send('window:restored')
    }
  })
`;

if (!code.includes('window:toggle-minimize')) {
  code = code.replace('registerIPC(store, mainWindow)', 'registerIPC(store, mainWindow)\n' + injection);
  fs.writeFileSync(file, code);
  console.log('✅ Main process patched.');
} else {
  console.log('ℹ️ Main process already patched.');
}
