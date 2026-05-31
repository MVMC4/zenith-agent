import { useEffect, useRef, useState } from 'react'
import Fuse from 'fuse.js'
import { AgentState, Command } from '../shared/types'

declare global {
  interface Window {
    agent: {
      getState: () => Promise<AgentState>
      sendCommand: (cmd: Command) => void
      onStateUpdate: (cb: (state: AgentState) => void) => () => void
      hideSelf: () => void
    }
  }
}

type Result = {
  type: 'deck' | 'task' | 'action'
  id: string
  name: string
  subtitle?: string
  action: () => void
}

export default function CommandApp() {
  const [state, setState] = useState<AgentState | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    window.agent.getState().then(setState)
    const unsub = window.agent.onStateUpdate(setState)
    return unsub
  }, [])

  useEffect(() => {
    const handler = () => inputRef.current?.focus()
    window.addEventListener('focus', handler)
    inputRef.current?.focus()
    return () => window.removeEventListener('focus', handler)
  }, [])

  useEffect(() => {
    if (!state) return
    const items: Result[] = [
      ...state.decks.map(d => ({
        type: 'deck' as const,
        id: d.id,
        name: d.name,
        subtitle: 'Deck',
        action: () => { window.agent.hideSelf() }
      })),
      ...state.tasks.map(t => {
        const deck = state.decks.find(d => d.id === t.deckId)
        return {
          type: 'task' as const,
          id: t.id,
          name: t.name,
          subtitle: deck?.name,
          action: () => {
            window.agent.sendCommand({ type: 'START_SESSION', taskIds: [t.id] })
            window.agent.hideSelf()
          }
        }
      }),
      {
        type: 'action',
        id: 'new-deck',
        name: 'Create new deck',
        subtitle: 'Action',
        action: () => {
          window.agent.sendCommand({ type: 'ADD_DECK', name: 'New Deck', color: '#c9a84c' })
          window.agent.hideSelf()
        }
      }
    ]

    if (!query) {
      setResults(items)
      return
    }

    const fuse = new Fuse(items, { keys: ['name', 'subtitle'], threshold: 0.3 })
    setResults(fuse.search(query).map(r => r.item))
    setSelected(0)
  }, [query, state])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected(s => Math.min(s + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected(s => Math.max(s - 1, 0))
    } else if (e.key === 'Enter' && results[selected]) {
      results[selected].action()
    } else if (e.key === 'Escape') {
      window.agent.hideSelf()
    }
  }

  return (
    <div className="w-full h-full card-soft p-0 overflow-hidden">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Type a command, card name, or deck..."
        className="w-full px-5 py-4 bg-transparent outline-none text-foreground text-lg font-light border-b border-border"
        autoFocus
      />
      <div className="overflow-y-auto max-h-80">
        {results.length === 0 && (
          <div className="px-5 py-8 text-center text-text-dim micro-caps">
            No results
          </div>
        )}
        {results.map((r, i) => (
          <div
            key={r.id + r.type}
            onMouseEnter={() => setSelected(i)}
            onClick={() => r.action()}
            className={`px-5 py-3 cursor-pointer flex justify-between items-center transition-colors ${
              i === selected ? 'bg-surface-3' : 'hover:bg-surface-2'
            }`}
          >
            <div>
              <div className="text-foreground">{r.name}</div>
              {r.subtitle && <div className="micro-caps mt-0.5">{r.subtitle}</div>}
            </div>
            <div className="micro-caps text-text-dim">{r.type}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
