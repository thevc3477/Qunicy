import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const initializedRef = useRef(false)

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) return null
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      return data
    } catch (err) {
      console.warn('fetchProfile error:', err?.message)
      return null
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    const { data: { session: s } } = await supabase.auth.getSession()
    if (s?.user) {
      const p = await fetchProfile(s.user.id)
      setProfile(p)
    }
  }, [fetchProfile])

  useEffect(() => {
    // Use onAuthStateChange as the PRIMARY auth source (not getSession)
    // This avoids the AbortError from React StrictMode double-mount
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      console.log('Auth state change:', _event, s?.user?.id || 'no user')
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) {
        const p = await fetchProfile(s.user.id)
        setProfile(p)
      } else {
        setProfile(null)
      }
      initializedRef.current = true
      setLoading(false)
    })

    // Fallback: if onAuthStateChange doesn't fire within 3s, try getSession
    const fallbackTimeout = setTimeout(async () => {
      if (!initializedRef.current) {
        console.log('Auth fallback: trying getSession')
        try {
          const { data: { session: s } } = await supabase.auth.getSession()
          setSession(s)
          setUser(s?.user ?? null)
          if (s?.user) {
            const p = await fetchProfile(s.user.id)
            setProfile(p)
          }
        } catch (err) {
          console.warn('Auth fallback failed:', err?.message)
        }
        initializedRef.current = true
        setLoading(false)
      }
    }, 3000)

    // Hard safety timeout — never stay stuck on loading
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        console.warn('Auth safety timeout — forcing loading=false')
        setLoading(false)
      }
    }, 6000)

    return () => {
      clearTimeout(fallbackTimeout)
      clearTimeout(safetyTimeout)
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
