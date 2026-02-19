import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Auth() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const [tab, setTab] = useState('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [resetEmailSent, setResetEmailSent] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)

  // If already logged in, redirect
  if (user) {
    const from = location.state?.from?.pathname || '/event'
    navigate(from, { replace: true })
    return null
  }

  const handleAuthSuccess = async (session) => {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, onboarding_completed')
      .eq('id', session.user.id)
      .maybeSingle()

    if (!existingProfile) {
      await supabase.from('profiles').insert({
        id: session.user.id,
        onboarding_completed: false,
        onboarding_step: 0,
      })
    }

    const isFirstTime = !existingProfile?.onboarding_completed
    if (isFirstTime) {
      navigate('/onboarding', { replace: true })
    } else {
      const from = location.state?.from?.pathname
      navigate(from || '/event', { replace: true })
    }
  }

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
          setError('Check your email to confirm your account, then sign in.')
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
        setError(err.message || 'Authentication failed.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/event`,
      })
      if (resetError) throw resetError
      setResetEmailSent(true)
    } catch (err) {
      setError(err.message || 'Failed to send reset email.')
    } finally {
      setLoading(false)
    }
  }

  if (showForgotPassword) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 20 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, color: '#FFFFFF' }}>Reset Password</h1>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 8 }}>
            {resetEmailSent ? 'Check your email for a reset link' : "Enter your email and we'll send you a reset link"}
          </p>
        </div>
        {!resetEmailSent ? (
          <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {error && (
              <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 12, color: '#ef4444', fontSize: 14 }}>
                {error}
              </div>
            )}
            <div>
              <label htmlFor="reset-email" style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Email</label>
              <input id="reset-email" type="email" placeholder="Enter your email" required value={email} onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '14px 16px', fontSize: 16, borderRadius: 12, border: '1px solid var(--border)', backgroundColor: 'var(--surface)', outline: 'none' }} />
            </div>
            <button type="submit" disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 24 }}>
              If an account exists with <strong>{email}</strong>, you'll receive a reset link.
            </p>
          </div>
        )}
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <button onClick={() => { setShowForgotPassword(false); setResetEmailSent(false); setError(null) }} className="secondary">
            ← Back to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 20 }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: '#F5F5F4', margin: '0 0 8px 0' }}>Quincy</h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: 0 }}>Discover music lovers at your favorite events</p>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 32, backgroundColor: 'var(--surface)', padding: 4, borderRadius: 12, border: '1px solid var(--border)' }}>
        {['signup', 'signin'].map(t => (
          <button key={t} onClick={() => { setTab(t); setError(null) }}
            style={{ flex: 1, padding: '12px 16px', fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 10, backgroundColor: tab === t ? 'var(--primary-color)' : 'transparent', color: tab === t ? 'white' : 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s ease' }}>
            {t === 'signup' ? 'Sign Up' : 'Sign In'}
          </button>
        ))}
      </div>

      <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && (
          <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 12, color: '#ef4444', fontSize: 14 }}>
            {error}
          </div>
        )}
        <div>
          <label htmlFor="email" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>Email</label>
          <input id="email" type="email" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '12px 14px', fontSize: 15, borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--surface)', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div>
          <label htmlFor="password" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>Password</label>
          <input id="password" type="password" placeholder={tab === 'signup' ? 'Min 6 characters' : 'Enter your password'} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '12px 14px', fontSize: 15, borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--surface)', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        {tab === 'signin' && (
          <button type="button" onClick={() => setShowForgotPassword(true)}
            style={{ background: 'none', border: 'none', color: '#FFFFFF', fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: 0, textAlign: 'left', width: 'auto', minHeight: 'auto' }}>
            Forgot password?
          </button>
        )}
        <button type="submit" disabled={loading} style={{ opacity: loading ? 0.7 : 1, marginTop: 8 }}>
          {loading ? (tab === 'signup' ? 'Creating account...' : 'Signing in...') : (tab === 'signup' ? 'Create Account' : 'Sign In')}
        </button>
      </form>
    </div>
  )
}
