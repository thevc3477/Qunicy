import { useState, useEffect } from 'react'

const steps = [
  {
    icon: '💿',
    title: 'Vinyl Wall',
    desc: "See what vinyl everyone's bringing to the meetup.",
  },
  {
    icon: '🔥',
    title: 'Discover',
    desc: 'Swipe right on records you vibe with. If they like yours too — it\'s a match!',
  },
  {
    icon: '💬',
    title: 'Connections',
    desc: 'Chat with your matches before the event. Break the ice so the meetup feels easy.',
  },
]

export default function Walkthrough() {
  const [step, setStep] = useState(0)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const seen = localStorage.getItem('quincy_walkthrough_done')
    if (!seen) setShow(true)
  }, [])

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1)
    } else {
      localStorage.setItem('quincy_walkthrough_done', 'true')
      setShow(false)
    }
  }

  if (!show) return null

  const current = steps[step]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }} onClick={handleNext}>
      <div style={{
        backgroundColor: 'var(--surface, #fff)',
        borderRadius: 20, padding: 32, maxWidth: 320, width: '100%',
        textAlign: 'center', position: 'relative',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>{current.icon}</div>
        <h2 style={{ fontSize: 22, marginBottom: 8, fontWeight: 700 }}>{current.title}</h2>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 24 }}>
          {current.desc}
        </p>

        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: '50%',
              backgroundColor: i === step ? 'var(--primary-color, #D97706)' : 'var(--border, #E7E0D5)',
              transition: 'background-color 0.2s',
            }} />
          ))}
        </div>

        <button onClick={handleNext} style={{ width: '100%' }}>
          {step < steps.length - 1 ? 'Next' : "Let's Go! 🎶"}
        </button>

        {step === 0 && (
          <button onClick={() => {
            localStorage.setItem('quincy_walkthrough_done', 'true')
            setShow(false)
          }} style={{
            width: '100%', marginTop: 8, backgroundColor: 'transparent',
            color: 'var(--text-secondary)', border: 'none', fontSize: 13,
            cursor: 'pointer',
          }}>
            Skip
          </button>
        )}
      </div>
    </div>
  )
}
