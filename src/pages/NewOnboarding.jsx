import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const QUESTIONS = [
  {
    id: 'music_identity',
    title: 'What best describes you?',
    type: 'single',
    options: [
      { value: 'vinyl_head', label: 'Vinyl Head', emoji: '💿', subtitle: "Your shelves are full and you wouldn't have it any other way" },
      { value: 'vibe_seeker', label: 'Vibe Seeker', emoji: '✨', subtitle: 'Here for the music, the people, and the energy' },
      { value: 'crate_digger', label: 'Crate Digger', emoji: '🎵', subtitle: "You can name any B-side and you're always hunting for the next gem" },
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

// Step 0 = profile, 1-3 = questions, 4 = record upload
const TOTAL_STEPS = 5

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
  const [recordFiles, setRecordFiles] = useState([null, null, null])
  const [recordPreviews, setRecordPreviews] = useState([null, null, null])
  const fileInputRefs = [useRef(null), useRef(null), useRef(null)]
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) navigate('/auth', { replace: true })
  }, [user, navigate])

  const totalSteps = TOTAL_STEPS
  const progress = ((currentStep + 1) / totalSteps) * 100

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setAvatarPreview(reader.result)
    reader.readAsDataURL(file)
  }

  const handleRecordFileChange = (index, e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const newFiles = [...recordFiles]
    newFiles[index] = file
    setRecordFiles(newFiles)
    const reader = new FileReader()
    reader.onloadend = () => {
      setRecordPreviews(prev => {
        const updated = [...prev]
        updated[index] = reader.result
        return updated
      })
    }
    reader.readAsDataURL(file)
  }

  const removeRecord = (index) => {
    setRecordFiles(prev => { const u = [...prev]; u[index] = null; return u })
    setRecordPreviews(prev => { const u = [...prev]; u[index] = null; return u })
  }

  const hasValidAnswer = () => {
    if (currentStep === 0) return displayName.trim().length > 0
    if (currentStep === 4) return true // record upload is always valid (skippable)
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

  const handleSubmit = async () => {
    if (!user) return
    setLoading(true)
    setError(null)

    try {
      // Upload avatar
      let avatarUrl = null
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()
        const path = `profile-photos/${user.id}-${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('records').upload(path, avatarFile)
        if (!upErr) avatarUrl = path
      }

      // Upload records
      const uploadedRecords = []
      const timestamp = Date.now()
      for (let i = 0; i < recordFiles.length; i++) {
        const file = recordFiles[i]
        if (!file) continue
        const ext = file.name.split('.').pop()
        const path = `vinyl-uploads/${user.id}/${timestamp}-${i}.${ext}`
        const { error: recErr } = await supabase.storage.from('records').upload(path, file)
        if (!recErr) {
          uploadedRecords.push(path)
        }
      }

      // Insert vinyl_records rows
      if (uploadedRecords.length > 0) {
        const rows = uploadedRecords.map(url => ({
          user_id: user.id,
          image_url: url,
        }))
        const { error: insertErr } = await supabase.from('vinyl_records').insert(rows)
        if (insertErr) console.error('vinyl_records insert error:', insertErr)
      }

      // Save profile
      const payload = {
        id: user.id,
        display_name: displayName.trim(),
        music_identity: answers.music_identity,
        top_genres: answers.top_genres,
        event_intent: answers.event_intent,
        onboarding_completed: true,
        onboarding_step: 5,
      }
      if (avatarUrl) payload.avatar_url = avatarUrl

      const { error: updateError } = await supabase.from('profiles').upsert(payload)
      if (updateError) throw updateError

      await refreshProfile()
      navigate('/event', { replace: true })
    } catch (err) {
      console.error('Onboarding error:', err)
      setError(err.message || 'Failed to save.')
    } finally {
      setLoading(false)
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
        <input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Display Name *</label>
        <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
          placeholder="What should people call you?"
          style={{
            width: '100%', padding: '14px 16px', fontSize: 15, borderRadius: 12,
            border: '1px solid var(--border)', backgroundColor: 'var(--surface)', outline: 'none', boxSizing: 'border-box',
          }}
        />
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

  const renderRecordUploadStep = () => (
    <div className="card" style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>
        Now for the fun part 🎶
      </h2>
      <p style={{ fontSize: 15, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 8, lineHeight: 1.5 }}>
        Upload up to 3 records you're into right now. This is how we match you with music friends and show you who's coming to meetups.
      </p>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 24, opacity: 0.7 }}>
        Don't have your records nearby? No worries — you can always add them later.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {[0, 1, 2].map((index) => (
          <div key={index} style={{ position: 'relative' }}>
            <input
              ref={fileInputRefs[index]}
              type="file"
              accept="image/*"
              onChange={(e) => handleRecordFileChange(index, e)}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              onClick={() => fileInputRefs[index].current?.click()}
              style={{
                width: '100%', aspectRatio: '1', borderRadius: 12,
                border: `2px dashed ${recordPreviews[index] ? 'var(--primary-color)' : 'var(--border)'}`,
                backgroundColor: recordPreviews[index] ? 'transparent' : 'var(--surface)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', padding: 0, position: 'relative',
              }}
            >
              {recordPreviews[index] ? (
                <img src={recordPreviews[index]} alt={`Record ${index + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 32, color: 'var(--text-secondary)', opacity: 0.5 }}>+</span>
              )}
            </button>
            {recordPreviews[index] && (
              <button type="button" onClick={() => removeRecord(index)}
                style={{
                  position: 'absolute', top: -6, right: -6, width: 24, height: 24,
                  borderRadius: '50%', backgroundColor: '#ef4444', color: 'white',
                  border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  lineHeight: 1,
                }}>
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      <button type="button" onClick={handleNext}
        style={{
          background: 'none', border: 'none', color: 'var(--text-secondary)',
          fontSize: 14, cursor: 'pointer', textDecoration: 'underline', marginTop: 8,
          padding: 8, alignSelf: 'center',
        }}>
        Skip for now
      </button>
    </div>
  )

  const renderCurrentStep = () => {
    if (currentStep === 0) return renderProfileStep()
    if (currentStep >= 1 && currentStep <= 3) return renderQuestionStep()
    if (currentStep === 4) return renderRecordUploadStep()
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
          {loading ? 'Saving...' : currentStep < totalSteps - 1 ? 'Next' : 'Finish'}
        </button>
      </div>
    </div>
  )
}
