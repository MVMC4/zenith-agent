import { useEffect, useState } from 'react'
import { AgentState } from '../shared/types'
import { View } from '../App'
import { formatDuration } from '../shared/utils'
import { Home, LayoutGrid, History, BookOpen, Search, Sparkles, Pause } from 'lucide-react'

type Props = { state: AgentState; view: View; setView: (v: View) => void }

export default function BottomBar({ state, view, setView }: Props) {
  const [elapsed, setElapsed] = useState(0)
  const isActive = !!state.active?.startedAt

  useEffect(() => { if (!isActive) { setElapsed(0); return } const id = setInterval(() => setElapsed(Math.floor((Date.now() - state.active!.startedAt!) / 1000)), 500); return () => clearInterval(id) }, [isActive, state.active?.startedAt])
  const taskName = state.active?.taskIds[0] ? state.tasks.find(t => t.id === state.active!.taskIds[0])?.name : 'Session'

  return (
    <div className="shrink-0 border-t border-[#1a1a1a] bg-[#050505] relative z-50">
      {isActive && (
        <div className="px-4 py-2.5 border-b border-[#1a1a1a] flex items-center justify-between bg-[#0a0a0a]">
          <div className="flex-1 min-w-0 mr-3"><div className="micro-caps text-[#c9a84c] text-[9px] mb-0.5">Active Focus</div><div className="text-sm text-[#ece9e3] truncate font-light">{taskName}</div></div>
          <div className="timer-mono text-[#ece9e3] text-xl mr-4">{formatDuration(elapsed)}</div>
          <button type="button" onClick={() => window.api.sendCommand({ type: 'STOP_SESSION' })} className="p-2 bg-[#c9a84c] text-[#000] rounded-lg hover:bg-[#d4b55d] transition-colors"><Pause size={14} strokeWidth={2.5} /></button>
        </div>
      )}
      <div className="flex justify-around items-center h-14 relative z-50">
        {[{id:'home',icon:Home,label:'Home'},{id:'decks',icon:LayoutGrid,label:'Decks'},{id:'history',icon:History,label:'History'},{id:'journal',icon:BookOpen,label:'Journal'},{id:'search',icon:Search,label:'Search'},{id:'zen',icon:Sparkles,label:'Zen'}].map(tab => {
          const Icon = tab.icon; const isActiveTab = view === tab.id
          return <button type="button" key={tab.id} onClick={() => setView(tab.id as View)} className={`flex flex-col items-center gap-1 px-3 py-1 transition-colors ${isActiveTab ? 'text-[#c9a84c]' : 'text-[#4a4a4a] hover:text-[#7a7a7a]'}`}><Icon size={18} strokeWidth={isActiveTab ? 2.5 : 1.5} /><span className="micro-caps text-[9px]" style={{ color: isActiveTab ? '#c9a84c' : undefined }}>{tab.label}</span></button>
        })}
      </div>
    </div>
  )
}
