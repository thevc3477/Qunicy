// STEP 1: frontend gating only; replace with Supabase later
// V1 Flow: Event (public) → Login → RSVP → Upload Record → People/Chat

import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import AppShell from './components/AppShell'
import Home from './pages/Home'
import Auth from './pages/Auth'
import NewOnboarding from './pages/NewOnboarding'
import Onboarding from './pages/Onboarding'
import Records from './pages/Records'
import RecordDetail from './pages/RecordDetail'
import Event from './pages/Event'
import People from './pages/People'
import ProfileDetail from './pages/ProfileDetail'
import MyProfile from './pages/MyProfile'
import Chat from './pages/Chat'

// Helper: Read localStorage flags
function useFlags() {
  return {
    isLoggedIn: localStorage.getItem('quincy_logged_in') === 'true',
    hasRSVP: localStorage.getItem('quincy_rsvp') === 'true',
    hasUploadedRecord: localStorage.getItem('quincy_uploaded_record') === 'true'
  }
}

// Guard: Require authentication
function RequireAuth({ children }) {
  const { isLoggedIn } = useFlags()
  const location = useLocation()

  if (!isLoggedIn) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  return children
}

// Guard: Require onboarding completion
function RequireOnboarding({ children }) {
  const { isLoggedIn } = useFlags()
  const location = useLocation()
  const [checkingOnboarding, setCheckingOnboarding] = useState(true)
  const [onboardingComplete, setOnboardingComplete] = useState(false)

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!isLoggedIn) {
        setCheckingOnboarding(false)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        setCheckingOnboarding(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', session.user.id)
        .maybeSingle()

      // Consider onboarding complete if flag is true
      setOnboardingComplete(profile?.onboarding_completed === true)
      setCheckingOnboarding(false)
    }

    checkOnboarding()
  }, [isLoggedIn])

  if (!isLoggedIn) {
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  if (checkingOnboarding) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
      </div>
    )
  }

  if (!onboardingComplete) {
    return <Navigate to="/onboarding" replace />
  }

  return children
}

// Guard: Require RSVP (and auth)
function RequireRSVP({ children }) {
  const { isLoggedIn, hasRSVP } = useFlags()
  const location = useLocation()

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!hasRSVP) {
    return <Navigate to="/event" replace />
  }

  return children
}

// Guard: Require vinyl upload (and auth + RSVP)
function RequireVinyl({ children }) {
  const { isLoggedIn, hasRSVP, hasUploadedRecord } = useFlags()
  const location = useLocation()

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!hasRSVP) {
    return <Navigate to="/event" replace />
  }

  if (!hasUploadedRecord) {
    return <Navigate to="/records" replace />
  }

  return children
}

export default function App() {
  const [authReady, setAuthReady] = useState(false)

  useEffect(() => {
    let isMounted = true

    const setLocalAuth = async (session) => {
      if (!isMounted) return
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', session.user.id)
          .maybeSingle()

        const username = profile?.display_name || session.user.email?.split('@')[0] || 'Collector'
        localStorage.setItem('quincy_logged_in', 'true')
        localStorage.setItem('quincy_user', JSON.stringify({
          id: session.user.id,
          email: session.user.email,
          username,
        }))
      } else {
        localStorage.removeItem('quincy_logged_in')
      }
      setAuthReady(true)
    }

    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        const legacyUser = localStorage.getItem('quincy_user')
        if (legacyUser) {
          try {
            const parsed = JSON.parse(legacyUser)
            if (parsed?.email && parsed?.password) {
              const { data, error } = await supabase.auth.signInWithPassword({
                email: parsed.email,
                password: parsed.password,
              })
              if (!error && data?.session) {
                await setLocalAuth(data.session)
                return
              }
            }
          } catch (err) {
            console.warn('Legacy login failed:', err)
          }
          localStorage.removeItem('quincy_logged_in')
        }
      }
      await setLocalAuth(session)
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setLocalAuth(session)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  if (!authReady) {
    return (
      <AppShell>
        <div style={{ padding: 20 }}>
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/event" element={<Event />} />
        
        {/* Redirect old auth routes to new unified auth page */}
        <Route path="/login" element={<Navigate to="/auth" replace />} />
        <Route path="/signup" element={<Navigate to="/auth" replace />} />

        {/* Onboarding route (auth required, but not onboarding) */}
        <Route path="/onboarding" element={<RequireAuth><NewOnboarding /></RequireAuth>} />
        
        {/* Legacy onboarding for music preferences */}
        <Route path="/music-preferences" element={<RequireOnboarding><Onboarding /></RequireOnboarding>} />

        {/* Protected routes (require auth + onboarding) */}
        <Route path="/me" element={<RequireOnboarding><MyProfile /></RequireOnboarding>} />
        <Route path="/records" element={<RequireOnboarding><Records /></RequireOnboarding>} />
        <Route path="/records/:id" element={<RequireOnboarding><RecordDetail /></RequireOnboarding>} />

        {/* Vinyl-gated routes (requires auth + onboarding + RSVP + upload) */}
        <Route path="/people" element={<RequireVinyl><People /></RequireVinyl>} />
        <Route path="/people/:id" element={<RequireVinyl><ProfileDetail /></RequireVinyl>} />
        <Route path="/chat/:id" element={<RequireVinyl><Chat /></RequireVinyl>} />
      </Routes>
    </AppShell>
  )
}
