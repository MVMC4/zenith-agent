import { useEffect, useState } from 'react'
import { AgentState, Command } from '../shared/types'
import { formatDuration } from '../shared/utils'
import { DECK_COLORS } from '../shared/constants'

declare global {
  interface Window {
    agent: {
      getState: () => Promise<AgentState>
      sendCommand: (cmd: Command) => void
      onStateUpdate: (cb: (state: AgentState) => void) => () => void
    }
  }
}

export default function FullApp() {
  const [state, setState] = useState<AgentState | null>(null)
  const [newTaskName, setNewTaskName] = useState('')
  const [selectedDeck, setSelectedDeck] = useState<string | null>(null)

  useEffect(() => {
    window.agent.getState().then(setState)
    const unsub = window.agent.onStateUpdate(setState)
    return unsub
  }, [])

  if (!state) return <div className="p-8 text-text-dim">Loading...</div>

  const addTask = () => {
    if (!newTaskName.trim() || !selectedDeck) return
    window.agent.sendCommand({ type: 'ADD_TASK', deckId: selectedDeck, name: newTaskName.trim() })
    setNewTaskName('')
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-light italic">Zenith</h1>
            <p className="micro-caps mt-1">Time tracking with intention</p>
          </div>
          <div className="micro-caps text-accent-gold">
            {state.tasks.length} cards · {state.decks.length} decks
          </div>
        </header>

        <div className="flex gap-2 mb-6 flex-wrap">
          {state.decks.map(deck => (
            <button
              key={deck.id}
              onClick={() => setSelectedDeck(deck.id)}
              className={`px-4 py-2 rounded-lg card-soft micro-caps flex items-center gap-2 transition-all ${
                selectedDeck === deck.id ? 'border-accent-gold' : ''
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: deck.color }}></span>
              {deck.name}
            </button>
          ))}
          <button
            onClick={() => {
              const name = prompt('Deck name:')
              if (name) window.agent.sendCommand({
                type: 'ADD_DECK',
                name,
                color: DECK_COLORS[Math.floor(Math.random() * DECK_COLORS.length)]
              })
            }}
            className="px-4 py-2 rounded-lg border border-dashed border-border-accent micro-caps text-text-dim hover:text-foreground"
          >
            + New Deck
          </button>
        </div>

        {selectedDeck && (
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              value={newTaskName}
              onChange={e => setNewTaskName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTask()}
              placeholder="New card name..."
              className="flex-1 px-4 py-3 bg-surface-2 border border-border rounded-lg outline-none focus:border-accent-gold"
            />
            <button onClick={addTask} className="px-6 py-3 bg-accent-gold text-background rounded-lg micro-caps font-medium">
              Add Card
            </button>
          </div>
        )}

        {state.decks.map(deck => {
          const tasks = state.tasks.filter(t => t.deckId === deck.id)
          if (tasks.length === 0) return null
          return (
            <section key={deck.id} className="mb-8">
              <h2 className="flex items-center gap-2 mb-3 font-light text-xl">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: deck.color }}></span>
                {deck.name}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {tasks.map(task => {
                  const isActive = state.active?.taskIds.includes(task.id)
                  return (
                    <div
                      key={task.id}
                      className={`card-soft p-4 ${isActive ? 'border-accent-gold pulse-gold' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-light">{task.name}</h3>
                        <span className="micro-caps timer-mono">
                          {formatDuration(task.totalSeconds)}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-3">
                        {!isActive ? (
                          <button
                            onClick={() => window.agent.sendCommand({ type: 'START_SESSION', taskIds: [task.id] })}
                            className="flex-1 py-1.5 bg-surface-3 border border-border-accent rounded micro-caps hover:border-accent-gold"
                          >
                            ▶ Start
                          </button>
                        ) : (
                          <button
                            onClick={() => window.agent.sendCommand({ type: 'STOP_SESSION' })}
                            className="flex-1 py-1.5 bg-accent-gold text-background rounded micro-caps"
                          >
                            ⏸ Stop
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (confirm('Delete this card?')) {
                              window.agent.sendCommand({ type: 'DELETE_TASK', id: task.id })
                            }
                          }}
                          className="px-3 py-1.5 border border-border-accent rounded micro-caps text-text-dim hover:text-foreground"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}

        {state.logs.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 font-light text-xl">Recent Sessions</h2>
            <div className="space-y-2">
              {state.logs.slice(-10).reverse().map(log => (
                <div key={log.id} className="card-soft p-3 flex justify-between items-center">
                  <div>
                    <div className="font-light">{log.taskName}</div>
                    <div className="micro-caps text-text-dim">{log.deckName}</div>
                  </div>
                  <div className="timer-mono text-accent-gold">
                    {formatDuration(log.duration)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
