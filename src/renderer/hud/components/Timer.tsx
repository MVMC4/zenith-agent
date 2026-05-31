import { useEffect, useState } from 'react'
import { formatDuration } from '../../shared/utils'

type Props = { startedAt: number | null }

export default function Timer({ startedAt }: Props) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!startedAt) {
      setElapsed(0)
      return
    }
    const update = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    update()
    const id = setInterval(update, 500)
    return () => clearInterval(id)
  }, [startedAt])

  return (
    <div className="timer-mono text-accent-gold text-2xl">
      {formatDuration(elapsed)}
    </div>
  )
}
