import { useState, useEffect } from 'react'
import { X, ChevronRight, ChevronLeft } from 'lucide-react'

type Props = { onComplete: () => void }

export default function Tutorial({ onComplete }: Props) {
  const [step, setStep] = useState(0)
  const steps = [
    { title: 'Welcome to Zenith', desc: 'A deliberate-practice timer for focused work.', img: '' },
    { title: 'Create a Deck', desc: 'Decks group your projects. Click + to add one.', img: '' },
    { title: 'Add a Card', desc: 'Cards are recurring focus blocks inside decks.', img: '' },
    { title: 'Start a Session', desc: 'Click ▶ on any card to begin tracking time.', img: '' },
    { title: 'Reflect in Journal', desc: 'Write markdown notes for any card or deck.', img: '' },
    { title: 'You\'re Ready', desc: 'Put the time in. Write what happened. Come back tomorrow.', img: '' }
  ]

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setStep(s => Math.min(5, s + 1))
      if (e.key === 'ArrowLeft') setStep(s => Math.max(0, s - 1))
      if (e.key === 'Escape') onComplete()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onComplete])

  return (
    <div className="absolute inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#050505] border border-[#1a1a1a] rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4"><span className="micro-caps">Step {step+1}/6</span><button onClick={onComplete} className="text-[#7a7a7a] hover:text-[#ece9e3]"><X size={18}/></button></div>
        <h3 className="text-lg font-light text-[#ece9e3] mb-2">{steps[step].title}</h3>
        <p className="text-[#7a7a7a] text-sm mb-4">{steps[step].desc}</p>
        {steps[step].img && <div className="bg-[#0a0a0a] rounded-lg h-40 mb-4 flex items-center justify-center micro-caps">[Screenshot]</div>}
        <div className="flex justify-between">
          <button onClick={() => setStep(s => Math.max(0, s-1))} disabled={step===0} className="px-4 py-2 micro-caps text-[#7a7a7a] disabled:opacity-30 flex items-center gap-1"><ChevronLeft size={14}/> Back</button>
          {step < 5 ? <button onClick={() => setStep(s => s+1)} className="px-4 py-2 micro-caps text-[#c9a84c] flex items-center gap-1">Next <ChevronRight size={14}/></button> : <button onClick={onComplete} className="px-4 py-2 bg-[#c9a84c] text-[#000] rounded-lg micro-caps font-medium">Get Started</button>}
        </div>
      </div>
    </div>
  )
}
