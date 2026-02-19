import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from './context/AuthContext'
import { supabase } from './lib/supabase'
import AppShell from './components/AppShell'
import Auth from './pages/Auth'
import NewOnboarding from './pages/NewOnboarding'
import Records from './pages/Records'
import RecordDetail from './pages/RecordDetail'
import Event from './pages/Event'
import ProfileDetail from './pages/ProfileDetail'
import MyProfile from './pages/MyProfile'
import Chat from './pages/Chat'
import Swipe from './pages/Swipe'
import Matches from './pages/Matches'

function RootRedirect() {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/auth" replace />
  if (!profile?.onboarding_completed) return <Navigate to="/onboarding" replace />
  return <Navigate to="/event" replace />
}

function LoadingScreen() {
  return (
    <div style={{ padding: 20, textAlign: 'center', marginTop: 40 }}>
      <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
    </div>
  )
}

function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />
  return <Outlet />
}

function RequireOnboarded() {
  const { user, profile, loading } = useAuth()
  const location = useLocation()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />
  if (!profile?.onboarding_completed) return <Navigate to="/onboarding" replace />
  return <Outlet />
}

function RequireNotOnboarded() {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/auth" replace />
  if (profile?.onboarding_completed) return <Navigate to="/event" replace />
  return <Outlet />
}

function RequireRsvp() {
  const { user, profile, loading } = useAuth()
  const location = useLocation()
  const [checking, setChecking] = useState(true)
  const [hasRsvp, setHasRsvp] = useState(false)

  useEffect(() => {
    if (loading || !user) return
    const check = async () => {
      const { data: event } = await supabase
        .from('events')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()
      if (!event) { setChecking(false); return }
      const { data: rsvp } = await supabase
        .from('rsvps')
        .select('id')
        .eq('event_id', event.id)
        .eq('user_id', user.id)
        .maybeSingle()
      setHasRsvp(!!rsvp)
      setChecking(false)
    }
    check()
  }, [loading, user])

  if (loading || checking) return <LoadingScreen />
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />
  if (!profile?.onboarding_completed) return <Navigate to="/onboarding" replace />
  if (!hasRsvp) return <Navigate to="/event" replace />
  return <Outlet />
}

function RequireUploaded() {
  const { user, profile, loading } = useAuth()
  const location = useLocation()
  const [checking, setChecking] = useState(true)
  const [hasRsvp, setHasRsvp] = useState(false)
  const [hasUploaded, setHasUploaded] = useState(false)

  useEffect(() => {
    if (loading || !user) return
    const check = async () => {
      const { data: event } = await supabase
        .from('events')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()
      if (!event) { setChecking(false); return }
      const { data: rsvp } = await supabase
        .from('rsvps')
        .select('id')
        .eq('event_id', event.id)
        .eq('user_id', user.id)
        .maybeSingle()
      setHasRsvp(!!rsvp)
      if (rsvp) {
        const { data: record } = await supabase
          .from('vinyl_records')
          .select('id')
          .eq('event_id', event.id)
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle()
        setHasUploaded(!!record)
      }
      setChecking(false)
    }
    check()
  }, [loading, user])

  if (loading || checking) return <LoadingScreen />
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />
  if (!profile?.onboarding_completed) return <Navigate to="/onboarding" replace />
  if (!hasRsvp) return <Navigate to="/event" replace />
  if (!hasUploaded) return <Navigate to="/records" replace />
  return <Outlet />
}

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/auth" element={<Auth />} />

        {/* Redirect old routes */}
        <Route path="/login" element={<Navigate to="/auth" replace />} />
        <Route path="/signup" element={<Navigate to="/auth" replace />} />
        <Route path="/home" element={<Navigate to="/event" replace />} />

        {/* Requires auth but NOT onboarded */}
        <Route element={<RequireNotOnboarded />}>
          <Route path="/onboarding" element={<NewOnboarding />} />
        </Route>

        {/* Requires auth + onboarded */}
        <Route element={<RequireOnboarded />}>
          <Route path="/event" element={<Event />} />
          <Route path="/me" element={<MyProfile />} />
          <Route path="/people/:id" element={<ProfileDetail />} />
        </Route>

        {/* Requires RSVP */}
        <Route element={<RequireRsvp />}>
          <Route path="/records" element={<Records />} />
          <Route path="/records/:id" element={<RecordDetail />} />
          <Route path="/swipe" element={<Swipe />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/chat/:matchId" element={<Chat />} />
        </Route>
      </Routes>
    </AppShell>
  )
}
