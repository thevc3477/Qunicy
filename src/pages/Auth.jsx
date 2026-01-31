import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const navigate = useNavigate()
  const location = useLocation()
  
  // Auth mode: 'password' or 'magic_link'
  const [authMode, setAuthMode] = useState('password')
  const [isSignUp, setIsSignUp] = useState(false)
  
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
    // First, ensure profile row exists (create if not)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, username, onboarding_completed')
      .eq('id', session.user.id)
      .maybeSingle()

    if (!existingProfile) {
      // Create profile row for new user
      await supabase.from('profiles').insert({
        id: session.user.id,
        onboarding_completed: false,
        onboarding_step: 0,
      })
    }

    const profile = existingProfile || { onboarding_completed: false }

    localStorage.setItem('quincy_logged_in', 'true')
    localStorage.setItem('quincy_user', JSON.stringify({
      id: session.user.id,
      email: session.user.email,
      username: profile?.username || '',
    }))

    // Check if first-time user (onboarding not completed)
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
      
      if (isSignUp) {
        // Sign up
        result = await supabase.auth.signUp({ email, password })
        if (result.error) throw result.error
        
        // Check if email confirmation is required
        if (result.data?.user && !result.data?.session) {
          setError(null)
          setMagicLinkSent(true) // Reuse this UI for "check your email"
          setLoading(false)
          return
        }
      } else {
        // Sign in
        result = await supabase.auth.signInWithPassword({ email, password })
        if (result.error) throw result.error
      }

      if (result.data?.session) {
        await handleAuthSuccess(result.data.session)
      }
    } catch (err) {
      if (err.message?.includes('Invalid login credentials')) {
        setError('Invalid email or password. Need an account? Click "Create account" below.')
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
          We sent a {isSignUp ? 'confirmation' : 'login'} link to <strong>{email}</strong>
        </p>
        <button
          onClick={() => {
            setMagicLinkSent(false)
            setIsSignUp(false)
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

  // Main auth screen
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: 20
    }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, color: 'var(--primary-color)' }}>Welcome to Quincy</h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 8 }}>
          {isSignUp ? 'Create your account' : 'Sign in to your account'}
        </p>
      </div>

      {/* Email/Password Form */}
      {authMode === 'password' && (
        <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
            <label htmlFor="email" style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 8,
            }}>
              Email
            </label>
            <input
              id="email"
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

          <div>
            <label htmlFor="password" style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 8,
            }}>
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder={isSignUp ? 'Create a password (min 6 characters)' : 'Enter your password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {loading ? (isSignUp ? 'Creating account...' : 'Signing in...') : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>

          {!isSignUp && (
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="secondary"
              style={{ fontSize: 14 }}
            >
              Forgot password?
            </button>
          )}
        </form>
      )}

      {/* Magic Link Form */}
      {authMode === 'magic_link' && (
        <form onSubmit={handleMagicLink} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 8,
            }}>
              Email
            </label>
            <input
              id="magic-email"
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
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
              We'll send you a magic link to sign in instantly
            </p>
          </div>

          <button type="submit" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Sending...' : 'Send Magic Link'}
          </button>
        </form>
      )}

      {/* Toggle between password and magic link */}
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <button
          onClick={() => {
            setAuthMode(authMode === 'password' ? 'magic_link' : 'password')
            setError(null)
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--primary-color)',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
            textDecoration: 'underline',
          }}
        >
          {authMode === 'password' ? 'Use magic link instead' : 'Use password instead'}
        </button>
      </div>

      {/* Sign up for free banner (when in sign-in mode) */}
      {authMode === 'password' && !isSignUp && (
        <div style={{
          marginTop: 24,
          padding: '16px 20px',
          backgroundColor: 'rgba(99, 102, 241, 0.08)',
          borderRadius: 12,
          textAlign: 'center',
        }}>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
            New to Quincy?
          </p>
          <button
            onClick={() => {
              setIsSignUp(true)
              setError(null)
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary-color)',
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
              padding: 0,
              marginTop: 4,
            }}
          >
            Sign up for free →
          </button>
        </div>
      )}

      {/* Back to sign in (when in sign-up mode) */}
      {authMode === 'password' && isSignUp && (
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <button
              onClick={() => {
                setIsSignUp(false)
                setError(null)
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary-color)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Sign in
            </button>
          </p>
        </div>
      )}

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <Link to="/" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          ← Back to Home
        </Link>
      </div>
    </div>
  )
}
