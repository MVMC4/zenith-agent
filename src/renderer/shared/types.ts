export type TimerMode = 'stopwatch' | 'countdown'

export type ChecklistItem = {
  id: string
  text: string
  done: boolean
}

export type Deck = {
  id: string
  name: string
  color: string
  createdAt: number
}

export type Task = {
  id: string
  deckId: string
  name: string
  tag: string
  totalSeconds: number
  createdAt: number
  checklist?: ChecklistItem[]
  mode?: TimerMode
  targetSeconds?: number
}

export type Log = {
  id: string
  taskId: string
  taskName: string
  deckName: string
  deckColor: string
  duration: number
  startedAt: number
  endedAt: number
}

export type Journal = {
  id: string
  taskId?: string
  deckId?: string
  content: string
  updatedAt: number
}

export type ActiveTask = {
  taskIds: string[]
  deckIds: string[]
  startedAt: number | null
} | null

export type Reminder = {
  id: string
  targetType: 'task' | 'deck'
  targetId: string
  label: string
  fireAt: number
  repeat: 'none' | 'daily' | 'weekdays' | 'weekly'
  enabled: boolean
}

export type AgentState = {
  version: number
  decks: Deck[]
  tasks: Task[]
  logs: Log[]
  journals: Journal[]
  active: ActiveTask
  reminders: Reminder[]
  hudPosition: { x: number; y: number }
}

// IPC Command types
export type Command =
  | { type: 'START_SESSION'; taskIds: string[] }
  | { type: 'STOP_SESSION' }
  | { type: 'ADD_DECK'; name: string; color: string }
  | { type: 'ADD_TASK'; deckId: string; name: string; tag?: string }
  | { type: 'DELETE_DECK'; id: string }
  | { type: 'DELETE_TASK'; id: string }
  | { type: 'ADD_NOTE'; content: string; targetId?: string }
  | { type: 'SET_HUD_POSITION'; x: number; y: number }
  | { type: 'TOGGLE_COMMAND_PALETTE' }
  | { type: 'TOGGLE_FULL_APP' }

export type QuotePackId = 'musashi' | 'stoic' | 'bible' | 'zen'
