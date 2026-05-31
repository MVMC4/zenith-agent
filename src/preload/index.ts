import { contextBridge, ipcRenderer } from 'electron'
contextBridge.exposeInMainWorld('api', {
  getState: () => ipcRenderer.invoke('agent:getState'),
  sendCommand: (cmd: any) => ipcRenderer.send('agent:command', cmd),
  onStateUpdate: (cb: (s: any) => void) => { const l = (_: any, s: any) => cb(s); ipcRenderer.on('agent:stateUpdate', l); return () => ipcRenderer.removeListener('agent:stateUpdate', l) },
  on: (chan: string, cb: (data: any) => void) => { const l = (_: any, d: any) => cb(d); ipcRenderer.on(chan, l); return () => ipcRenderer.removeListener(chan, l) },
  hideWindow: () => ipcRenderer.send('window:hide'),
  toggleMinimize: () => ipcRenderer.send('window:toggle-minimize')
})
