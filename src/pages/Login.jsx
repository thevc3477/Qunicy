import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError || !data?.session?.user) {
      setError(signInError?.message || 'Invalid email or password. Please try again.')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', data.session.user.id)
      .maybeSingle()

    const username = profile?.display_name || data.session.user.email?.split('@')[0] || 'Collector'
    localStorage.setItem('quincy_logged_in', 'true')
    localStorage.setItem('quincy_user', JSON.stringify({
      id: data.session.user.id,
      email: data.session.user.email,
      username,
    }))

    const from = location.state?.from?.pathname
    navigate(from || '/home', { replace: true })
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
        <h1 style={{ fontSize: 28, color: 'var(--primary-color)' }}>Welcome Back</h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 8 }}>
          Login to your account
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            placeholder="Enter your password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: 'var(--primary-color)', fontWeight: 600 }}>
            Create account
          </Link>
        </p>
        <Link to="/" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          ← Back to Home
        </Link>
      </div>
    </div>
  )
}
