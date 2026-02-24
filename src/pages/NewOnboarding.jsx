import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const QUESTIONS = [
  {
    id: 'music_identity',
    title: 'What best describes you?',
    type: 'single',
    options: [
      { value: 'casual_listener', label: 'Casual Listener', emoji: '🎵', subtitle: 'I just love music and good vibes' },
      { value: 'crate_digger', label: 'Crate Digger', emoji: '📦', subtitle: "Always digging for the next gem" },
      { value: 'serious_collector', label: 'Serious Collector', emoji: '🏆', subtitle: 'My collection is my pride and joy' },
    ],
  },
  {
    id: 'top_genres',
    title: 'Pick up to 3 genres you vibe with most',
    type: 'multi',
    maxSelect: 3,
    options: [
      { value: 'house', label: 'House', emoji: '🏠' },
      { value: 'techno', label: 'Techno', emoji: '⚡' },
      { value: 'jazz', label: 'Jazz', emoji: '🎷' },
      { value: 'soul_funk', label: 'Soul / Funk', emoji: '🕺' },
      { value: 'hiphop', label: 'Hip-Hop', emoji: '🎤' },
      { value: 'rnb', label: 'R&B', emoji: '💜' },
      { value: 'afrobeat', label: 'Afrobeat', emoji: '🥁' },
      { value: 'latin', label: 'Latin', emoji: '💃' },
      { value: 'rock', label: 'Rock', emoji: '🎸' },
      { value: 'electronic', label: 'Electronic', emoji: '🔮' },
    ],
  },
  {
    id: 'event_intent',
    title: 'What brings you to Vinyl Collectiv events?',
    type: 'single',
    options: [
      { value: 'discovering_music', label: 'Discovering new music', emoji: '✨' },
      { value: 'meeting_people', label: 'Meeting people', emoji: '👋' },
      { value: 'dancing', label: 'Dancing / high energy', emoji: '💃' },
      { value: 'chilling', label: 'Chilling / vibing', emoji: '😌' },
      { value: 'supporting_artists', label: 'Supporting artists', emoji: '❤️' },
    ],
  },
]

// Step 0 = profile, 1-3 = questions
const TOTAL_STEPS = 4

export default function NewOnboarding() {
  const navigate = useNavigate()
  const { user, refreshProfile } = useAuth()

  const [currentStep, setCurrentStep] = useState(0)
  const [displayName, setDisplayName] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [answers, setAnswers] = useState({
    music_identity: null,
    top_genres: [],
    event_intent: null,
  })
  const [loading, setLoading] = useState(false)
  const [savingStatus, setSavingStatus] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) navigate('/auth', { replace: true })
  }, [user, navigate])

  const totalSteps = TOTAL_STEPS
  const progress = ((currentStep + 1) / totalSteps) * 100

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowed = ['image/png', 'image/jpeg', 'image/jpg']
    if (!allowed.includes(file.type)) {
      setError('Please upload a PNG or JPEG image.')
      return
    }
    setError(null)
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setAvatarPreview(reader.result)
    reader.readAsDataURL(file)
  }

  const hasValidAnswer = () => {
    if (currentStep === 0) return displayName.trim().length > 0
    const q = QUESTIONS[currentStep - 1]
    if (q.type === 'single') return answers[q.id] !== null
    if (q.type === 'multi') return answers[q.id].length > 0
    return false
  }

  const handleSingleSelect = (value) => {
    const q = QUESTIONS[currentStep - 1]
    setAnswers(prev => ({ ...prev, [q.id]: value }))
  }

  const handleMultiSelect = (value) => {
    const q = QUESTIONS[currentStep - 1]
    const sel = answers[q.id]
    const max = q.maxSelect || 3
    if (sel.includes(value)) {
      setAnswers(prev => ({ ...prev, [q.id]: sel.filter(v => v !== value) }))
    } else if (sel.length < max) {
      setAnswers(prev => ({ ...prev, [q.id]: [...sel, value] }))
    }
  }

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      handleSubmit()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1)
  }

  const compressImage = (file, maxWidth = 800, quality = 0.7) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      img.onload = () => {
        let width = img.width
        let height = img.height
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = URL.createObjectURL(file)
    })
  }

  const handleSubmit = async () => {
    if (!user) return
    setLoading(true)
    setSavingStatus('Saving your profile...')
    setError(null)

    try {
      // Get auth token directly from localStorage — bypass Supabase client completely
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ailkqrjqiuemdkdtgewc.supabase.co'
      const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpbGtxcmpxaXVlbWRrZHRnZXdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NjM4NjMsImV4cCI6MjA4MzIzOTg2M30.OtMZf_33oo1Vj1OCEgnua7n-w4Q-4ko-qErSh19DT5Q'
      
      // Extract the project ref from the URL for the localStorage key
      const projectRef = SUPABASE_URL.match(/\/\/([^.]+)/)?.[1] || 'ailkqrjqiuemdkdtgewc'
      const storageKey = `sb-${projectRef}-auth-token`
      const stored = localStorage.getItem(storageKey)
      
      let accessToken = null
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          accessToken = parsed.access_token
        } catch (e) {
          console.warn('Failed to parse stored token')
        }
      }
      
      if (!accessToken) {
        throw new Error('Not logged in. Please refresh the page and sign in again.')
      }
      
      console.log('Got token from localStorage, saving profile for:', user.id)

      // Save profile with plain fetch — no Supabase client involved
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      
      // Use POST with upsert header (creates row if missing, updates if exists)
      const saveRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles`,
        {
          method: 'POST',
          headers: {
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates,return=representation',
          },
          body: JSON.stringify({
            id: user.id,
            display_name: displayName.trim(),
            music_identity: answers.music_identity,
            top_genres: answers.top_genres,
            event_intent: answers.event_intent,
            onboarding_completed: true,
            onboarding_step: 5,
          }),
          signal: controller.signal,
        }
      )
      clearTimeout(timeout)
      
      const responseText = await saveRes.text()
      console.log('Profile save response:', saveRes.status, responseText)
      
      if (!saveRes.ok) {
        console.error('Profile save failed:', saveRes.status, responseText)
        throw new Error(`Save failed (${saveRes.status}). Please try again.`)
      }
      
      // Verify it actually saved
      const saved = JSON.parse(responseText)
      if (!saved?.[0]?.onboarding_completed) {
        console.error('Profile saved but onboarding_completed is not true:', saved)
        throw new Error('Save did not complete properly. Please try again.')
      }

      // Auto-RSVP (non-blocking)
      let activeEventId = null
      try {
        const evRes = await fetch(
          `${SUPABASE_URL}/rest/v1/events?is_active=eq.true&select=id&limit=1`,
          { headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${accessToken}` } }
        )
        const evData = await evRes.json()
        if (evData?.[0]?.id) activeEventId = evData[0].id
      } catch (e) { console.warn('Failed to get active event:', e) }

      if (activeEventId) {
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/rsvps`, {
            method: 'POST',
            headers: {
              'apikey': ANON_KEY,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates,return=minimal',
            },
            body: JSON.stringify({
              user_id: user.id,
              event_id: activeEventId,
              status: 'going',
            }),
          })
        } catch (e) { console.warn('Auto-RSVP failed (non-blocking):', e) }
      }

      // Done! Navigate to event page
      setSavingStatus('You\'re in! 🎉')
      await new Promise(r => setTimeout(r, 600))
      
      // Force reload to pick up new profile state
      window.location.href = '/event'
    } catch (err) {
      console.error('Onboarding error:', err)
      if (err.name === 'AbortError') {
        setError('Save timed out. Please check your connection and try again.')
      } else {
        setError(err.message || 'Failed to save. Please try again.')
      }
    } finally {
      setLoading(false)
      setSavingStatus('')
    }
  }

  const renderProfileStep = () => (
    <div className="card" style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24, textAlign: 'center' }}>
        Set up your profile
      </h2>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <label htmlFor="avatar-upload" style={{ cursor: 'pointer' }}>
          <div style={{
            width: 100, height: 100, borderRadius: '50%',
            backgroundColor: 'rgba(99, 102, 241, 0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 40, overflow: 'hidden',
            border: '3px dashed var(--border)',
          }}>
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : '📷'}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', marginTop: 8 }}>
            {avatarPreview ? 'Change photo' : 'Add photo (optional)'}
          </p>
        </label>
        <input id="avatar-upload" type="file" accept=".png,.jpg,.jpeg" onChange={handleAvatarChange} style={{ display: 'none' }} />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Display Name *</label>
        <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value.slice(0, 30))}
          placeholder="What should people call you?"
          maxLength={30}
          style={{
            width: '100%', padding: '14px 16px', fontSize: 15, borderRadius: 12,
            border: '1px solid var(--border)', backgroundColor: 'var(--surface)', outline: 'none', boxSizing: 'border-box',
          }}
        />
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'right', marginTop: 4 }}>
          {displayName.length}/30
        </p>
      </div>
    </div>
  )

  const renderQuestionStep = () => {
    const q = QUESTIONS[currentStep - 1]
    const isMusicIdentity = q.id === 'music_identity'
    return (
      <div className="card" style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24, textAlign: 'center' }}>{q.title}</h2>
        {q.type === 'multi' && (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 16, marginTop: -16 }}>
            {answers[q.id].length}/{q.maxSelect} selected
          </p>
        )}
        <div style={{
          display: 'grid',
          gridTemplateColumns: q.type === 'multi' ? 'repeat(2, 1fr)' : '1fr',
          gap: 12, flex: 1,
        }}>
          {q.options.map((option) => {
            const isSelected = q.type === 'single'
              ? answers[q.id] === option.value
              : answers[q.id].includes(option.value)
            return (
              <button key={option.value} type="button"
                onClick={() => q.type === 'single' ? handleSingleSelect(option.value) : handleMultiSelect(option.value)}
                style={{
                  padding: isMusicIdentity ? '20px 20px' : q.type === 'multi' ? '16px 12px' : '16px 20px',
                  fontSize: 15, fontWeight: isSelected ? 600 : 400,
                  backgroundColor: isSelected ? 'var(--primary-color)' : 'var(--surface)',
                  color: isSelected ? 'white' : 'var(--text-primary)',
                  border: `2px solid ${isSelected ? 'var(--primary-color)' : 'var(--border)'}`,
                  borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: isMusicIdentity ? 'column' : 'row',
                  alignItems: isMusicIdentity ? 'flex-start' : 'center',
                  justifyContent: q.type === 'multi' ? 'center' : isMusicIdentity ? 'center' : 'flex-start',
                  gap: isMusicIdentity ? 4 : 10,
                  textAlign: isMusicIdentity ? 'left' : undefined,
                }}>
                {isMusicIdentity ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 24 }}>{option.emoji}</span>
                      <span style={{ fontSize: 16, fontWeight: 600 }}>{option.label}</span>
                    </div>
                    {option.subtitle && (
                      <span style={{ fontSize: 13, fontWeight: 400, opacity: isSelected ? 0.85 : 0.6, marginTop: 2 }}>
                        {option.subtitle}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    {option.emoji && <span style={{ fontSize: 20 }}>{option.emoji}</span>}
                    {option.label}
                  </>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const renderCurrentStep = () => {
    if (currentStep === 0) return renderProfileStep()
    if (currentStep >= 1 && currentStep <= 3) return renderQuestionStep()
    return null
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: 20, paddingBottom: 100 }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, color: '#F5F5F4', marginBottom: 4 }}>Welcome to Quincy</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Let's set up your profile</p>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Step {currentStep + 1} of {totalSteps}</span>
          <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{Math.round(progress)}%</span>
        </div>
        <div style={{ height: 6, backgroundColor: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress}%`, backgroundColor: 'var(--primary-color)', borderRadius: 3, transition: 'width 0.3s ease' }} />
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 12, color: '#ef4444', fontSize: 14, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {renderCurrentStep()}

      {/* Saving overlay */}
      {loading && savingStatus && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          flexDirection: 'column', gap: 16,
        }}>
          <div style={{ fontSize: 48, animation: 'pulse 1.5s ease-in-out infinite' }}>
            {savingStatus.includes('reading') ? '🔍' : savingStatus.includes('record') ? '💿' : '✨'}
          </div>
          <p style={{ fontSize: 18, fontWeight: 600, color: 'white', textAlign: 'center', padding: '0 20px' }}>
            {savingStatus}
          </p>
          <div style={{
            width: 40, height: 40, border: '3px solid rgba(255,255,255,0.2)',
            borderTopColor: 'white', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
            @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
          `}</style>
        </div>
      )}

      {/* Navigation */}
      <div style={{
        display: 'flex', gap: 12, marginTop: 24,
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: 20, backgroundColor: 'var(--background)', borderTop: '1px solid var(--border)',
      }}>
        {currentStep > 0 && (
          <button type="button" onClick={handleBack} className="secondary" style={{ flex: 1 }}>Back</button>
        )}
        <button type="button" onClick={handleNext} disabled={!hasValidAnswer() || loading}
          style={{ flex: currentStep > 0 ? 1 : '1 1 100%', opacity: (!hasValidAnswer() || loading) ? 0.5 : 1 }}>
          {loading ? (savingStatus || 'Saving...') : currentStep < totalSteps - 1 ? 'Next' : 'Finish'}
        </button>
      </div>
    </div>
  )
}
