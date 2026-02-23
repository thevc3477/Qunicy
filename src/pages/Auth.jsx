import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Auth() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const [step, setStep] = useState('phone') // 'phone' | 'otp'
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)

  // If already logged in, redirect
  if (user) {
    const from = location.state?.from?.pathname || '/event'
    navigate(from, { replace: true })
    return null
  }

  // Format phone for display
  const formatPhoneInput = (value) => {
    const digits = value.replace(/\D/g, '')
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
  }

  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
    setPhone(digits)
  }

  const getFullPhone = () => `+1${phone}` // US numbers

  const handleAuthSuccess = async (session) => {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ailkqrjqiuemdkdtgewc.supabase.co'
    const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpbGtxcmpxaXVlbWRrZHRnZXdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NjM4NjMsImV4cCI6MjA4MzIzOTg2M30.OtMZf_33oo1Vj1OCEgnua7n-w4Q-4ko-qErSh19DT5Q'
    const token = session.access_token

    try {
      // Check if profile exists
      const checkRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${session.user.id}&select=id,onboarding_completed`,
        {
          headers: {
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${token}`,
          },
        }
      )
      const profiles = await checkRes.json()
      const existingProfile = profiles?.[0]

      // Create profile if it doesn't exist
      if (!existingProfile) {
        await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
          method: 'POST',
          headers: {
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            id: session.user.id,
            onboarding_completed: false,
            onboarding_step: 0,
          }),
        })
      }

      const isFirstTime = !existingProfile?.onboarding_completed
      if (isFirstTime) {
        window.location.href = '/onboarding'
      } else {
        window.location.href = location.state?.from?.pathname || '/event'
      }
    } catch (err) {
      console.error('Auth success handler error:', err)
      window.location.href = '/onboarding'
    }
  }

  const handleSendOtp = async (e) => {
    e.preventDefault()
    setError(null)
    setInfo(null)

    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number.')
      return
    }

    setLoading(true)
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: getFullPhone(),
      })
      if (otpError) throw otpError
      setInfo(`We sent a code to (${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`)
      setStep('otp')
    } catch (err) {
      setError(err.message || 'Failed to send verification code.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone: getFullPhone(),
        token: otp,
        type: 'sms',
      })
      if (verifyError) throw verifyError
      if (data?.session) {
        await handleAuthSuccess(data.session)
      }
    } catch (err) {
      if (err.message?.includes('Invalid') || err.message?.includes('expired')) {
        setError('Invalid or expired code. Please try again.')
      } else {
        setError(err.message || 'Verification failed.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setError(null)
    setInfo(null)
    setLoading(true)
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: getFullPhone(),
      })
      if (otpError) throw otpError
      setInfo('New code sent!')
    } catch (err) {
      setError(err.message || 'Failed to resend code.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 20 }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: '#F5F5F4', margin: '0 0 8px 0' }}>Quincy</h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: 0 }}>Discover music lovers at your favorite events</p>
      </div>

      {step === 'phone' ? (
        <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 12, color: '#ef4444', fontSize: 14 }}>
              {error}
            </div>
          )}
          <div>
            <label htmlFor="phone" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>Phone Number</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, color: 'var(--text-secondary)', padding: '12px 0 12px 14px', backgroundColor: 'var(--surface)', borderRadius: '10px 0 0 10px', border: '1px solid var(--border)', borderRight: 'none', lineHeight: '1.4' }}>+1</span>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                placeholder="(555) 123-4567"
                required
                value={formatPhoneInput(phone)}
                onChange={handlePhoneChange}
                style={{
                  flex: 1, padding: '12px 14px', fontSize: 15, borderRadius: '0 10px 10px 0',
                  border: '1px solid var(--border)', borderLeft: 'none', backgroundColor: 'var(--surface)',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
          <button type="submit" disabled={loading || phone.length !== 10} style={{ opacity: (loading || phone.length !== 10) ? 0.5 : 1, marginTop: 8 }}>
            {loading ? 'Sending code...' : 'Send Verification Code'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && (
            <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 12, color: '#ef4444', fontSize: 14 }}>
              {error}
            </div>
          )}
          {info && (
            <div style={{ padding: '12px 16px', backgroundColor: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: 12, color: '#93c5fd', fontSize: 14 }}>
              {info}
            </div>
          )}
          <div>
            <label htmlFor="otp" style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text-secondary)' }}>Verification Code</label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              placeholder="Enter 6-digit code"
              required
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              style={{
                width: '100%', padding: '14px 16px', fontSize: 20, letterSpacing: '0.3em',
                textAlign: 'center', borderRadius: 12, border: '1px solid var(--border)',
                backgroundColor: 'var(--surface)', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          <button type="submit" disabled={loading || otp.length !== 6} style={{ opacity: (loading || otp.length !== 6) ? 0.5 : 1, marginTop: 8 }}>
            {loading ? 'Verifying...' : 'Verify & Continue'}
          </button>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 4 }}>
            <button type="button" onClick={handleResend} disabled={loading}
              style={{ background: 'none', border: 'none', color: '#93c5fd', fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: 0, minHeight: 'auto', width: 'auto' }}>
              Resend code
            </button>
            <button type="button" onClick={() => { setStep('phone'); setOtp(''); setError(null); setInfo(null) }}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: 0, minHeight: 'auto', width: 'auto' }}>
              Change number
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
