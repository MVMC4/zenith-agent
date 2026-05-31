import { ipcMain, BrowserWindow } from 'electron'
import { MainStore } from '../store'
import { z } from 'zod'

const schema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('START_SESSION'), taskIds: z.array(z.string()) }),
  z.object({ type: z.literal('STOP_SESSION') }),
  z.object({ type: z.literal('ADD_DECK'), name: z.string(), color: z.string() }),
  z.object({ type: z.literal('ADD_TASK'), deckId: z.string(), name: z.string(), tag: z.string().optional(), mode: z.enum(['stopwatch','countdown']).optional(), targetSeconds: z.number().optional() }),
  z.object({ type: z.literal('DELETE_DECK'), id: z.string() }),
  z.object({ type: z.literal('DELETE_TASK'), id: z.string() }),
  z.object({ type: z.literal('UPSERT_JOURNAL'), content: z.string(), targetId: z.string(), targetType: z.enum(['task','deck']) }),
  z.object({ type: z.literal('TOGGLE_CHECKLIST'), taskId: z.string(), itemId: z.string() }),
  z.object({ type: z.literal('ADD_CHECKLIST_ITEM'), taskId: z.string(), text: z.string() }),
  z.object({ type: z.literal('ADD_REMINDER'), reminder: z.any() }),
  z.object({ type: z.literal('REMOVE_REMINDER'), id: z.string() }),
  z.object({ type: z.literal('SET_TUTORIAL_SEEN'), seen: z.boolean() }),
  z.object({ type: z.literal('SET_ZEN_PREFS'), pack: z.string(), interval: z.number(), wallpaper: z.string() })
])

export function registerIPC(store: MainStore, mainWindow: BrowserWindow) {
  ipcMain.handle('agent:getState', () => store.getState())
  ipcMain.on('agent:command', (_, raw) => { const result = schema.safeParse(raw); if (result.success) store.handleCommand(result.data) })
  ipcMain.on('window:hide', () => mainWindow?.hide())
  store.subscribe(state => { if (!mainWindow.isDestroyed()) mainWindow.webContents.send('agent:stateUpdate', state) })
}
