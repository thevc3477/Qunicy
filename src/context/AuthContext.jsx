import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const initializedRef = useRef(false)

  const fetchProfile = useCallback(async (userId, accessToken) => {
    if (!userId) return null
    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ailkqrjqiuemdkdtgewc.supabase.co'
      const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpbGtxcmpxaXVlbWRrZHRnZXdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NjM4NjMsImV4cCI6MjA4MzIzOTg2M30.OtMZf_33oo1Vj1OCEgnua7n-w4Q-4ko-qErSh19DT5Q'
      
      // Get token from param, or from localStorage
      let token = accessToken
      if (!token) {
        const projectRef = SUPABASE_URL.match(/\/\/([^.]+)/)?.[1] || 'ailkqrjqiuemdkdtgewc'
        const stored = localStorage.getItem(`sb-${projectRef}-auth-token`)
        if (stored) {
          try { token = JSON.parse(stored).access_token } catch(e) {}
        }
      }
      if (!token) return null
      
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`,
        {
          headers: {
            'apikey': ANON_KEY,
            'Authorization': `Bearer ${token}`,
          },
        }
      )
      if (!res.ok) return null
      const data = await res.json()
      return data?.[0] || null
    } catch (err) {
      console.warn('fetchProfile error:', err?.message)
      return null
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    try {
      // Try to get user from state or localStorage
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ailkqrjqiuemdkdtgewc.supabase.co'
      const projectRef = SUPABASE_URL.match(/\/\/([^.]+)/)?.[1] || 'ailkqrjqiuemdkdtgewc'
      const stored = localStorage.getItem(`sb-${projectRef}-auth-token`)
      if (stored) {
        const parsed = JSON.parse(stored)
        const payload = JSON.parse(atob(parsed.access_token.split('.')[1]))
        const p = await fetchProfile(payload.sub, parsed.access_token)
        setProfile(p)
      }
    } catch (err) {
      console.warn('refreshProfile error:', err?.message)
    }
  }, [fetchProfile])

  useEffect(() => {
    // INSTANT: Check localStorage immediately for returning users
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ailkqrjqiuemdkdtgewc.supabase.co'
    const projectRef = SUPABASE_URL.match(/\/\/([^.]+)/)?.[1] || 'ailkqrjqiuemdkdtgewc'
    const stored = localStorage.getItem(`sb-${projectRef}-auth-token`)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed.access_token) {
          const payload = JSON.parse(atob(parsed.access_token.split('.')[1]))
          // Check token not expired
          if (payload.exp * 1000 > Date.now()) {
            const instantSession = { access_token: parsed.access_token, user: { id: payload.sub, email: payload.email, phone: payload.phone } }
            setSession(instantSession)
            setUser(instantSession.user)
            initializedRef.current = true
            setLoading(false)
            // Fetch profile in background
            fetchProfile(payload.sub, parsed.access_token).then(p => setProfile(p))
          }
        }
      } catch (e) {
        console.warn('Instant auth parse failed:', e?.message)
      }
    }

    // onAuthStateChange handles updates (token refresh, sign out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      console.log('Auth state change:', _event, s?.user?.id || 'no user')
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        const p = await fetchProfile(s.user.id, s.access_token)
        setProfile(p)
      } else {
        setProfile(null)
      }
      initializedRef.current = true
      setLoading(false)
    })

    // Fallback: if nothing resolved within 3s
    const fallbackTimeout = setTimeout(() => {
      if (!initializedRef.current) {
        console.warn('Auth fallback timeout — no session found')
        initializedRef.current = true
        setLoading(false)
      }
    }, 3000)

    return () => {
      clearTimeout(fallbackTimeout)
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
