import { useEffect, useState } from 'react'
import { AgentState, Command } from '../shared/types'
import { formatDuration } from '../shared/utils'
import Timer from './components/Timer'
import QuickActions from './components/QuickActions'

declare global {
  interface Window {
    agent: {
      getState: () => Promise<AgentState>
      sendCommand: (cmd: Command) => void
      onStateUpdate: (cb: (state: AgentState) => void) => () => void
      openFull: () => void
    }
  }
}

export default function HUDApp() {
  const [state, setState] = useState<AgentState | null>(null)

  useEffect(() => {
    window.agent.getState().then(setState)
    const unsub = window.agent.onStateUpdate(setState)
    return unsub
  }, [])

  const activeTaskName = state?.active?.taskIds[0]
    ? state.tasks.find(t => t.id === state.active!.taskIds[0])?.name || 'Untitled'
    : 'No active task'

  const totalWeekSeconds = state?.logs
    .filter(l => l.startedAt > Date.now() - 7 * 24 * 3600 * 1000)
    .reduce((sum, l) => sum + l.duration, 0) || 0

  return (
    <div 
      className="w-full h-full p-3 card-soft"
      style={{
        background: 'linear-gradient(180deg, #0a0a0a 0%, #050505 100%)',
        border: '1px solid #1a1a1a',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
      }}
    >
      <div className="flex justify-between items-center mb-2" style={{ fontSize: '11px', color: '#7a7a7a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        <span className={state?.active ? 'pulse-gold' : ''} style={{ color: state?.active ? '#c9a84c' : '#7a7a7a' }}>
          {state?.active ? '● FOCUS' : '○ IDLE'}
        </span>
        <span>{formatDuration(totalWeekSeconds)} this week</span>
      </div>

      <div className="mb-3">
        <div className="truncate mb-1" style={{ color: '#ece9e3', fontSize: '14px', fontWeight: 300 }}>
          {activeTaskName}
        </div>
        <Timer startedAt={state?.active?.startedAt || null} />
      </div>

      <QuickActions isRunning={!!state?.active} />
    </div>
  )
}
