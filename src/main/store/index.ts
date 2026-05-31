import { BrowserWindow } from 'electron'
import { produce } from 'immer'
import { promises as fs } from 'fs'
import { app } from 'electron'
import path from 'path'
import { AgentState, Command, Reminder } from '../../shared/types'
import { generateId } from '../../shared/utils'
import { DEFAULT_STATE, STORAGE_KEY } from '../../shared/constants'

export class MainStore {
  private state: AgentState
  private filePath: string
  private listeners = new Set<(state: AgentState) => void>()
  private reminderInterval: NodeJS.Timeout | null = null

  constructor() {
    this.filePath = path.join(app.getPath('userData'), `${STORAGE_KEY}.json`)
    this.state = { ...DEFAULT_STATE, version: 0 }
  }

  async init() {
    try { const raw = await fs.readFile(this.filePath, 'utf-8'); this.state = { ...DEFAULT_STATE, ...JSON.parse(raw), version: 0 } }
    catch { await this.persist() }
    this.startReminderPoller()
  }

  private async persist() { try { await fs.writeFile(this.filePath, JSON.stringify(this.state, null, 2), 'utf-8') } catch {} }
  private broadcast() { for (const fn of this.listeners) fn(this.state) }
  subscribe(listener: (state: AgentState) => void) { this.listeners.add(listener); return () => this.listeners.delete(listener) }

  private update(recipe: (draft: AgentState) => void): void {
    this.state = produce(this.state, (draft) => { recipe(draft); draft.version++ }); this.persist(); this.broadcast()
  }

  handleCommand(cmd: Command) {
    switch (cmd.type) {
      case 'START_SESSION': this.startSession(cmd.taskIds); break
      case 'STOP_SESSION': this.stopSession(); break
      case 'ADD_DECK': this.addDeck(cmd.name, cmd.color); break
      case 'ADD_TASK': this.addTask(cmd.deckId, cmd.name, cmd.tag, cmd.mode, cmd.targetSeconds); break
      case 'DELETE_DECK': this.deleteDeck(cmd.id); break
      case 'DELETE_TASK': this.deleteTask(cmd.id); break
      case 'UPSERT_JOURNAL': this.upsertJournal(cmd.content, cmd.targetId, cmd.targetType); break
      case 'TOGGLE_CHECKLIST': this.toggleChecklist(cmd.taskId, cmd.itemId); break
      case 'ADD_CHECKLIST_ITEM': this.addChecklistItem(cmd.taskId, cmd.text); break
      case 'ADD_REMINDER': this.addReminder(cmd.reminder); break
      case 'REMOVE_REMINDER': this.removeReminder(cmd.id); break
      case 'SET_TUTORIAL_SEEN': this.update(d => d.tutorialSeen = cmd.seen); break
      case 'SET_ZEN_PREFS': this.update(d => { d.zenPack = cmd.pack; d.zenInterval = cmd.interval; d.zenWallpaper = cmd.wallpaper }); break
    }
  }

  getState() { return this.state }

  private startSession(taskIds: string[]) { this.update(d => { if (d.active?.startedAt && d.active.taskIds.length) this.commitSession(d, d.active); const deckIds = taskIds.map(id => d.tasks.find(t => t.id === id)?.deckId || ''); d.active = { taskIds, deckIds, startedAt: Date.now() } }) }
  private stopSession() { this.update(d => { if (d.active?.startedAt && d.active.taskIds.length) this.commitSession(d, d.active); d.active = null }) }
  
  private commitSession(draft: AgentState, active: NonNullable<AgentState['active']>) {
    const dur = Math.floor((Date.now() - active.startedAt!) / 1000); if (dur < 1) return
    active.taskIds.forEach((tid, i) => { 
      const task = draft.tasks.find(t => t.id === tid); 
      if (!task) return; 
      task.totalSeconds += dur; 
      const deck = draft.decks.find(dd => dd.id === task.deckId); 
      draft.logs.push({ 
        id: generateId(), taskId: tid, taskName: task.name, 
        deckName: deck?.name || '', deckColor: deck?.color || '#c9a84c', 
        duration: dur, startedAt: active.startedAt!, 
        endedAt: Date.now(),
        hasJournal: false
      }) 
    })
  }

  private addDeck(name: string, color: string) { this.update(d => d.decks.push({ id: generateId(), name, color, createdAt: Date.now() })) }
  private addTask(deckId: string, name: string, tag?: string, mode?: 'stopwatch'|'countdown', targetSeconds?: number) { this.update(d => d.tasks.push({ id: generateId(), deckId, name, tag: tag||'', totalSeconds: 0, createdAt: Date.now(), mode, targetSeconds: mode==='countdown'?targetSeconds??1500:undefined })) }
  
  private deleteDeck(id: string) { 
    this.update(d => { 
      const taskIds = d.tasks.filter(t => t.deckId === id).map(t => t.id); 
      d.reminders = d.reminders.filter(r =>
        !(r.targetType === 'deck' && r.targetId === id) &&
        !(r.targetType === 'task' && taskIds.includes(r.targetId))
      );
      d.decks = d.decks.filter(dd => dd.id !== id); 
      d.tasks = d.tasks.filter(t => t.deckId !== id); 
      d.journals = d.journals.filter(j => j.deckId !== id && (!j.taskId || !taskIds.includes(j.taskId))); 
      if (d.active) { 
        d.active.taskIds = d.active.taskIds.filter(tid => !taskIds.includes(tid)); 
        d.active.deckIds = d.active.deckIds.filter(did => did !== id); 
        if (!d.active.taskIds.length) d.active = null 
      } 
    }) 
  }

  private deleteTask(id: string) { 
    this.update(d => { 
      d.tasks = d.tasks.filter(t => t.id !== id); 
      d.journals = d.journals.filter(j => j.taskId !== id); 
      d.reminders = d.reminders.filter(r => r.targetId !== id && r.targetType === 'task'); 
      if (d.active?.taskIds.includes(id)) { 
        const idx = d.active.taskIds.indexOf(id);
        if (idx !== -1) {
          d.active.taskIds.splice(idx, 1);
          d.active.deckIds.splice(idx, 1);
        }
        if (!d.active.taskIds.length) d.active = null 
      } 
    }) 
  }

  private upsertJournal(content: string, targetId: string, targetType: 'task'|'deck') { this.update(d => { const existing = d.journals.find(j => targetType==='task'?j.taskId===targetId:j.deckId===targetId); if (existing) { existing.content = content; existing.updatedAt = Date.now() } else d.journals.push({ id: generateId(), [targetType==='task'?'taskId':'deckId']: targetId, content, updatedAt: Date.now() }) }) }
  private toggleChecklist(taskId: string, itemId: string) { this.update(d => { const task = d.tasks.find(t => t.id === taskId); if (task?.checklist) task.checklist = task.checklist.map(i => i.id === itemId ? { ...i, done: !i.done } : i) }) }
  private addChecklistItem(taskId: string, text: string) { this.update(d => { const task = d.tasks.find(t => t.id === taskId); if (task) { if (!task.checklist) task.checklist = []; task.checklist.push({ id: generateId(), text: text.trim(), done: false }) } }) }
  private addReminder(reminder: Omit<Reminder, 'id'|'lastFiredAt'|'createdAt'>) { this.update(d => d.reminders.push({ ...reminder, id: generateId(), createdAt: Date.now(), lastFiredAt: undefined })) }
  private removeReminder(id: string) { this.update(d => d.reminders = d.reminders.filter(r => r.id !== id)) }

  private startReminderPoller() {
    if (this.reminderInterval) clearInterval(this.reminderInterval)
    const check = () => { const now = Date.now(); this.update(d => { d.reminders = d.reminders.map(r => { if (!r.enabled) return r; let due = false; if (r.repeat === 'none') due = r.fireAt <= now && (!r.lastFiredAt || r.lastFiredAt < r.fireAt); else { const base = new Date(r.fireAt); const today = new Date(now); today.setHours(base.getHours(), base.getMinutes(), 0, 0); const trigger = today.getTime(); const dayOk = r.repeat === 'daily' || (r.repeat === 'weekdays' && today.getDay() >= 1 && today.getDay() <= 5) || (r.repeat === 'weekly' && today.getDay() === (r.weekday ?? base.getDay())); due = dayOk && trigger <= now && (now - trigger < 90000) && (!r.lastFiredAt || r.lastFiredAt < trigger) } if (due) { for (const win of BrowserWindow.getAllWindows()) win.webContents.send('reminder:fire', r); return { ...r, lastFiredAt: now, enabled: r.repeat === 'none' ? false : r.enabled } } return r }) }) }
    check(); this.reminderInterval = setInterval(check, 15000)
  }
}
