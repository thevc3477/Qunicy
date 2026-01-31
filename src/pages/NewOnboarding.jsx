import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Question data
const QUESTIONS = [
  {
    id: 'music_identity',
    title: 'What best describes you?',
    type: 'single',
    options: [
      { value: 'casual_listener', label: 'Casual listener', emoji: '🎧' },
      { value: 'vinyl_collector', label: 'Vinyl collector', emoji: '💿' },
      { value: 'vinyl_dj', label: 'Vinyl DJ', emoji: '🎚️' },
      { value: 'live_music_lover', label: 'Live-music lover', emoji: '🎤' },
      { value: 'music_explorer', label: 'Music explorer', emoji: '🔍' },
    ],
  },
  {
    id: 'top_genres',
    title: 'Pick up to 3 genres you vibe with most',
    type: 'multi',
    maxSelect: 3,
    options: [
      { value: 'house', label: 'House' },
      { value: 'techno', label: 'Techno' },
      { value: 'jazz', label: 'Jazz' },
      { value: 'soul_funk', label: 'Soul / Funk' },
      { value: 'hiphop', label: 'Hip-Hop' },
      { value: 'rnb', label: 'R&B' },
      { value: 'afrobeat', label: 'Afrobeat' },
      { value: 'latin', label: 'Latin' },
      { value: 'rock', label: 'Rock' },
      { value: 'electronic', label: 'Electronic' },
    ],
  },
  {
    id: 'event_intent',
    title: 'What brings you to music events?',
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

export default function NewOnboarding() {
  const navigate = useNavigate()
  
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState({
    music_identity: null,
    top_genres: [],
    event_intent: null,
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [userId, setUserId] = useState(null)

  // Get current user on mount
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUserId(session.user.id)
      } else {
        navigate('/auth', { replace: true })
      }
    }
    getUser()
  }, [navigate])

  const totalSteps = QUESTIONS.length
  const currentQuestion = QUESTIONS[currentStep]
  const progress = ((currentStep + 1) / totalSteps) * 100

  // Check if current step has a valid answer
  const hasValidAnswer = () => {
    if (currentQuestion.type === 'single') {
      return answers[currentQuestion.id] !== null
    } else if (currentQuestion.type === 'multi') {
      return answers[currentQuestion.id].length > 0
    }
    return false
  }

  // Handle single select
  const handleSingleSelect = (value) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: value,
    }))
  }

  // Handle multi select
  const handleMultiSelect = (value) => {
    const currentSelection = answers[currentQuestion.id]
    const maxSelect = currentQuestion.maxSelect || 3
    
    if (currentSelection.includes(value)) {
      // Remove if already selected
      setAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: currentSelection.filter(v => v !== value),
      }))
    } else if (currentSelection.length < maxSelect) {
      // Add if under max
      setAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: [...currentSelection, value],
      }))
    }
  }

  // Go to next step
  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      handleSubmit()
    }
  }

  // Go to previous step
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  // Submit onboarding data
  const handleSubmit = async () => {
    if (!userId) {
      setError('Not authenticated. Please log in again.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          music_identity: answers.music_identity,
          top_genres: answers.top_genres,
          event_intent: answers.event_intent,
          onboarding_completed: true,
          onboarding_step: 3,
        })

      if (updateError) {
        throw updateError
      }

      // Update localStorage
      const existingUser = localStorage.getItem('quincy_user')
      if (existingUser) {
        const userData = JSON.parse(existingUser)
        localStorage.setItem('quincy_user', JSON.stringify({
          ...userData,
          onboarding_completed: true,
        }))
      }

      navigate('/home', { replace: true })
    } catch (err) {
      console.error('Onboarding error:', err)
      setError(err.message || 'Failed to save. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      padding: 20,
      paddingBottom: 100,
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, color: 'var(--primary-color)', marginBottom: 4 }}>
          Personalized Onboarding
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          Help us find your perfect vinyl connections
        </p>
      </div>

      {/* Progress Indicator */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 8
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            Step {currentStep + 1} of {totalSteps}
          </span>
          <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            {Math.round(progress)}% complete
          </span>
        </div>
        <div style={{
          height: 6,
          backgroundColor: 'var(--border)',
          borderRadius: 3,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            backgroundColor: 'var(--primary-color)',
            borderRadius: 3,
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>

      {/* Question Card */}
      <div className="card" style={{ 
        padding: 24, 
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <h2 style={{ 
          fontSize: 20, 
          fontWeight: 600, 
          marginBottom: 24,
          textAlign: 'center',
        }}>
          {currentQuestion.title}
        </h2>

        {currentQuestion.type === 'multi' && (
          <p style={{ 
            fontSize: 13, 
            color: 'var(--text-secondary)', 
            textAlign: 'center',
            marginBottom: 16,
            marginTop: -16,
          }}>
            {answers[currentQuestion.id].length}/{currentQuestion.maxSelect} selected
          </p>
        )}

        {error && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 12,
            color: '#ef4444',
            fontSize: 14,
            marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        {/* Options */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: currentQuestion.type === 'multi' ? 'repeat(2, 1fr)' : '1fr',
          gap: 12,
          flex: 1,
        }}>
          {currentQuestion.options.map((option) => {
            const isSelected = currentQuestion.type === 'single'
              ? answers[currentQuestion.id] === option.value
              : answers[currentQuestion.id].includes(option.value)

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  if (currentQuestion.type === 'single') {
                    handleSingleSelect(option.value)
                  } else {
                    handleMultiSelect(option.value)
                  }
                }}
                style={{
                  padding: currentQuestion.type === 'multi' ? '16px 12px' : '16px 20px',
                  fontSize: 15,
                  fontWeight: isSelected ? 600 : 400,
                  backgroundColor: isSelected ? 'var(--primary-color)' : 'var(--surface)',
                  color: isSelected ? 'white' : 'var(--text-primary)',
                  border: `2px solid ${isSelected ? 'var(--primary-color)' : 'var(--border)'}`,
                  borderRadius: 12,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: currentQuestion.type === 'multi' ? 'center' : 'flex-start',
                  gap: 10,
                  textAlign: currentQuestion.type === 'multi' ? 'center' : 'left',
                }}
              >
                {option.emoji && <span style={{ fontSize: 20 }}>{option.emoji}</span>}
                {option.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div style={{
        display: 'flex',
        gap: 12,
        marginTop: 24,
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        backgroundColor: 'var(--background)',
        borderTop: '1px solid var(--border)',
      }}>
        {currentStep > 0 && (
          <button
            type="button"
            onClick={handleBack}
            className="secondary"
            style={{ flex: 1 }}
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={handleNext}
          disabled={!hasValidAnswer() || loading}
          style={{
            flex: currentStep > 0 ? 1 : '1 1 100%',
            opacity: (!hasValidAnswer() || loading) ? 0.5 : 1,
          }}
        >
          {loading ? 'Saving...' : currentStep < totalSteps - 1 ? 'Next' : 'Finish'}
        </button>
      </div>
    </div>
  )
}
