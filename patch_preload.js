const fs = require('fs');
const file = 'src/preload/index.ts';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('toggleMinimize')) {
  code = code.replace(
    "hideWindow: () => ipcRenderer.send('window:hide')",
    "hideWindow: () => ipcRenderer.send('window:hide'),\n  toggleMinimize: () => ipcRenderer.send('window:toggle-minimize')"
  );
  fs.writeFileSync(file, code);
  console.log('✅ Preload patched.');
}
