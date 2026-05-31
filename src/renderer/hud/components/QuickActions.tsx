type Props = { isRunning: boolean }

export default function QuickActions({ isRunning }: Props) {
  const btn = "flex-1 py-1.5 rounded-lg bg-surface-2 border border-border-accent hover:border-accent-gold transition-colors micro-caps"

  return (
    <div className="flex gap-2">
      {!isRunning ? (
        <button className={btn} onClick={() => window.agent.openFull()}>
          ▶ Start
        </button>
      ) : (
        <button className={btn} onClick={() => window.agent.sendCommand({ type: 'STOP_SESSION' })}>
          ⏸ Stop
        </button>
      )}
      <button className={btn} onClick={() => window.agent.openFull()}>✎ Note</button>
      <button className={btn} onClick={() => window.agent.openFull()}>⚙ Full</button>
    </div>
  )
}
