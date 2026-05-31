export const DECK_COLORS = [
  '#c9a84c', '#7a7a7a', '#b0a999', '#6e5524',
  '#4a4a4a', '#1a1a1a', '#ece9e3', '#2c2c2c'
]

export const STORAGE_KEY = 'zenith_agent_state'

export const DEFAULT_STATE = {
  version: 0,
  decks: [
    { id: 'deck-academic', name: 'Academics', color: '#c9a84c', createdAt: Date.now() },
    { id: 'deck-projects', name: 'Projects', color: '#7a7a7a', createdAt: Date.now() }
  ],
  tasks: [],
  logs: [],
  journals: [],
  active: null,
  reminders: [],
  hudPosition: { x: 50, y: 50 }
}
