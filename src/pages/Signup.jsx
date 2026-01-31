import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Signup() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Basic validation
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address')
      setLoading(false)
      return
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    })

    if (signUpError) {
      setError(signUpError.message || 'Could not create account.')
      setLoading(false)
      return
    }

    if (data?.session?.user) {
      await supabase
        .from('profiles')
        .upsert({
          id: data.session.user.id,
          display_name: formData.username.trim(),
        })

      localStorage.setItem('quincy_logged_in', 'true')
      localStorage.setItem('quincy_user', JSON.stringify({
        id: data.session.user.id,
        email: data.session.user.email,
        username: formData.username.trim(),
      }))
    } else {
      setNeedsEmailConfirm(true)
    }

    // Show success message
    setShowSuccess(true)
    setLoading(false)

    // Redirect after showing success message
    setTimeout(() => {
      navigate('/home')
    }, 1500)
  }

  if (showSuccess) {
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
        <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
        <h1 style={{ fontSize: 24, color: 'var(--primary-color)', marginBottom: 8 }}>
          Account Created!
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>
          {needsEmailConfirm
            ? 'Check your email to confirm your account, then log in.'
            : `Welcome to Quincy, ${formData.username}`}
        </p>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: 20
    }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, color: 'var(--primary-color)' }}>Join Quincy</h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 8 }}>
          Create your account
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
          <label
            htmlFor="username"
            style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 8,
              color: 'var(--text-primary)'
            }}
          >
            Username
          </label>
          <input
            id="username"
            type="text"
            placeholder="Choose a username"
            required
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            style={{
              width: '100%',
              padding: '14px 16px',
              fontSize: 16,
              borderRadius: 12,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        </div>

        <div>
          <label
            htmlFor="email"
            style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 8,
              color: 'var(--text-primary)'
            }}
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="Enter your email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            style={{
              width: '100%',
              padding: '14px 16px',
              fontSize: 16,
              borderRadius: 12,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        </div>

        <div>
          <label
            htmlFor="password"
            style={{
              display: 'block',
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 8,
              color: 'var(--text-primary)'
            }}
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="Choose a password (min 6 characters)"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            style={{
              width: '100%',
              padding: '14px 16px',
              fontSize: 16,
              borderRadius: 12,
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
        </div>

        <button type="submit" disabled={loading} style={{ marginTop: 8, opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--primary-color)', fontWeight: 600 }}>
            Log in
          </Link>
        </p>
        <Link to="/" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          ← Back to Home
        </Link>
      </div>
    </div>
  )
}
