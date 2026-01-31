import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const navigate = useNavigate()
  const location = useLocation()
  
  // Tab state: 'signup' or 'signin'
  const [tab, setTab] = useState('signup')
  
  // Auth mode: 'password' or 'magic_link'
  const [authMode, setAuthMode] = useState('password')
  
  // Form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [resetEmailSent, setResetEmailSent] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)

  // Helper: Ensure profile exists and check onboarding
  const handleAuthSuccess = async (session) => {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, username, onboarding_completed')
      .eq('id', session.user.id)
      .maybeSingle()

    if (!existingProfile) {
      await supabase.from('profiles').insert({
        id: session.user.id,
        onboarding_completed: false,
        onboarding_step: 0,
      })
    }

    const profile = existingProfile || { onboarding_completed: false }

    localStorage.setItem('quincy_user', JSON.stringify({
      id: session.user.id,
      email: session.user.email,
      username: profile?.username || '',
    }))

    const isFirstTimeUser = !profile?.onboarding_completed || !profile?.username
    
    if (isFirstTimeUser) {
      navigate('/onboarding', { replace: true })
    } else {
      const from = location.state?.from?.pathname
      navigate(from || '/home', { replace: true })
    }
  }

  // Email/Password: Sign in or Sign up
  const handleEmailAuth = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      let result
      
      if (tab === 'signup') {
        result = await supabase.auth.signUp({ email, password })
        if (result.error) throw result.error
        
        if (result.data?.user && !result.data?.session) {
          setError(null)
          setMagicLinkSent(true)
          setLoading(false)
          return
        }
      } else {
        result = await supabase.auth.signInWithPassword({ email, password })
        if (result.error) throw result.error
      }

      if (result.data?.session) {
        await handleAuthSuccess(result.data.session)
      }
    } catch (err) {
      if (err.message?.includes('Invalid login credentials')) {
        setError('Invalid email or password.')
      } else if (err.message?.includes('already registered')) {
        setError('This email is already registered. Please sign in instead.')
      } else {
        setError(err.message || 'Authentication failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Magic Link: Send email link
  const handleMagicLink = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error: magicError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/home`,
        },
      })

      if (magicError) throw magicError

      setMagicLinkSent(true)
    } catch (err) {
      setError(err.message || 'Failed to send magic link.')
    } finally {
      setLoading(false)
    }
  }

  // Forgot password
  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/home`,
      })

      if (resetError) throw resetError

      setResetEmailSent(true)
    } catch (err) {
      setError(err.message || 'Failed to send reset email.')
    } finally {
      setLoading(false)
    }
  }

  // Magic link sent success screen
  if (magicLinkSent) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        textAlign: 'center'
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
        <h1 style={{ fontSize: 24, color: 'var(--primary-color)', marginBottom: 8 }}>
          Check your email
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 24 }}>
          We sent a {tab === 'signup' ? 'confirmation' : 'login'} link to <strong>{email}</strong>
        </p>
        <button
          onClick={() => {
            setMagicLinkSent(false)
            setTab('signin')
          }}
          className="secondary"
        >
          ← Back to login
        </button>
      </div>
    )
  }

  // Forgot password screen
  if (showForgotPassword) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 20
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, color: 'var(--primary-color)' }}>Reset Password</h1>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 8 }}>
            {resetEmailSent ? 'Check your email for a reset link' : "Enter your email and we'll send you a reset link"}
          </p>
        </div>

        {!resetEmailSent ? (
          <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {error && (
              <div style={{
                padding: '12px 16px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 12,
                color: '#ef4444',
                fontSize: 14,
              }}>
                {error}
              </div>
            )}

            <div>
              <label htmlFor="reset-email" style={{
                display: 'block',
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 8,
              }}>
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                placeholder="Enter your email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: 16,
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface)',
                  outline: 'none',
                }}
              />
            </div>

            <button type="submit" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 24 }}>
              If an account exists with <strong>{email}</strong>, you'll receive a password reset link shortly.
            </p>
          </div>
        )}

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <button
            onClick={() => {
              setShowForgotPassword(false)
              setResetEmailSent(false)
              setError(null)
            }}
            className="secondary"
          >
            ← Back to login
          </button>
        </div>
      </div>
    )
  }

  // Main auth screen - REDESIGNED FOR CLARITY
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: 20
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: 'var(--primary-color)', margin: '0 0 8px 0' }}>
          Quincy
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: 0 }}>
          Discover music lovers at your favorite events
        </p>
      </div>

      {/* Tab Switcher */}
      <div style={{
        display: 'flex',
        gap: 12,
        marginBottom: 32,
        backgroundColor: 'var(--surface)',
        padding: 4,
        borderRadius: 12,
        border: '1px solid var(--border)',
      }}>
        <button
          onClick={() => {
            setTab('signup')
            setError(null)
            setAuthMode('password')
          }}
          style={{
            flex: 1,
            padding: '12px 16px',
            fontSize: 14,
            fontWeight: 600,
            border: 'none',
            borderRadius: 10,
            backgroundColor: tab === 'signup' ? 'var(--primary-color)' : 'transparent',
            color: tab === 'signup' ? 'white' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Sign Up
        </button>
        <button
          onClick={() => {
            setTab('signin')
            setError(null)
            setAuthMode('password')
          }}
          style={{
            flex: 1,
            padding: '12px 16px',
            fontSize: 14,
            fontWeight: 600,
            border: 'none',
            borderRadius: 10,
            backgroundColor: tab === 'signin' ? 'var(--primary-color)' : 'transparent',
            color: tab === 'signin' ? 'white' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Sign In
        </button>
      </div>

      {/* Form Container */}
      <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 12,
            color: '#ef4444',
            fontSize: 14,
          }}>
            {error}
          </div>
        )}

        {/* Email Input */}
        <div>
          <label htmlFor="email" style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 6,
            color: 'var(--text-secondary)',
          }}>
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              fontSize: 15,
              borderRadius: 10,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Password Input */}
        <div>
          <label htmlFor="password" style={{
            display: 'block',
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 6,
            color: 'var(--text-secondary)',
          }}>
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder={tab === 'signup' ? 'Min 6 characters' : 'Enter your password'}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 14px',
              fontSize: 15,
              borderRadius: 10,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Forgot Password Link (only on sign-in) */}
        {tab === 'signin' && (
          <button
            type="button"
            onClick={() => setShowForgotPassword(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary-color)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              padding: 0,
              textAlign: 'left',
            }}
          >
            Forgot password?
          </button>
        )}

        {/* Primary CTA Button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '14px 16px',
            fontSize: 15,
            fontWeight: 600,
            borderRadius: 10,
            border: 'none',
            backgroundColor: 'var(--primary-color)',
            color: 'white',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            marginTop: 8,
          }}
        >
          {loading ? (tab === 'signup' ? 'Creating account...' : 'Signing in...') : (tab === 'signup' ? 'Create Account' : 'Sign In')}
        </button>
      </form>

      {/* Magic Link Toggle */}
      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <button
          onClick={() => {
            setAuthMode(authMode === 'password' ? 'magic_link' : 'password')
            setError(null)
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--primary-color)',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            padding: 0,
            textDecoration: 'underline',
          }}
        >
          {authMode === 'password' ? 'Use magic link instead' : 'Use password instead'}
        </button>
      </div>

      {/* Magic Link Form (Hidden by default, shown when toggled) */}
      {authMode === 'magic_link' && (
        <form onSubmit={handleMagicLink} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
          {error && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 12,
              color: '#ef4444',
              fontSize: 14,
            }}>
              {error}
            </div>
          )}

          <div>
            <label htmlFor="magic-email" style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 6,
              color: 'var(--text-secondary)',
            }}>
              Email
            </label>
            <input
              id="magic-email"
              type="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                fontSize: 15,
                borderRadius: 10,
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, margin: '6px 0 0 0' }}>
              We'll send you a link to sign in instantly
            </p>
          </div>

          <button type="submit" disabled={loading} style={{ opacity: loading ? 0.7 : 1, padding: '14px 16px', fontSize: 15, fontWeight: 600, borderRadius: 10, border: 'none', backgroundColor: 'var(--primary-color)', color: 'white', cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Sending...' : 'Send Magic Link'}
          </button>
        </form>
      )}

      {/* Back to Home */}
      <div style={{ marginTop: 32, textAlign: 'center' }}>
        <Link to="/" style={{ fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}>
          ← Back to Home
        </Link>
      </div>
    </div>
  )
}
