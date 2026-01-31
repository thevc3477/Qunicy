import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import QuickRsvpModal from '../components/QuickRsvpModal'

export default function Event() {
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRsvping, setIsRsvping] = useState(false)
  const [isRsvped, setIsRsvped] = useState(false)
  const [rsvpSuccess, setRsvpSuccess] = useState(false)
  const [rsvpError, setRsvpError] = useState(null)
  const [showRsvpModal, setShowRsvpModal] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [instagramHandle, setInstagramHandle] = useState('')
  const [pendingUserId, setPendingUserId] = useState(null)

  const loadEvent = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('id, title, starts_at, venue_name, city, is_active')
      .eq('is_active', true)
      .order('starts_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (!error) {
      setEvent(data)
    } else {
      console.error('Failed to load event:', error)
    }
    setIsLoading(false)
    return data
  }

  useEffect(() => {
    loadEvent()
  }, [])

  useEffect(() => {
    const checkRsvp = async () => {
      if (!event?.id) return
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return

      const { data: rsvp } = await supabase
        .from('rsvps')
        .select('status')
        .eq('event_id', event.id)
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (rsvp?.status === 'going') {
        setIsRsvped(true)
      }
    }

    checkRsvp()
  }, [event?.id])

  const eventName = event?.title || 'Upcoming Vinyl Collectiv Event'
  const eventDate = event?.starts_at ? new Date(event.starts_at) : null
  const dateLabel = eventDate ? eventDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'TBD'
  const timeLabel = eventDate ? eventDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'TBD'

  const formatRsvpError = (error) => {
    if (!error) return 'Could not complete RSVP. Please try again.'
    const message = error.message || String(error)
    if (/permission denied/i.test(message)) {
      return 'RSVP permissions are missing in Supabase. Please add an insert policy for rsvps.'
    }
    return message
  }

  const finalizeRsvp = async ({ userId, activeEvent, profilePayload }) => {
    if (profilePayload) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          display_name: profilePayload.display_name,
          instagram_handle: profilePayload.instagram_handle || null,
        })

      if (profileError) {
        console.error('Failed to update profile:', profileError)
        setRsvpError(formatRsvpError(profileError))
        return false
      }
    }

    const { error: rsvpError } = await supabase
      .from('rsvps')
      .upsert(
        {
          event_id: activeEvent.id,
          user_id: userId,
          status: 'going',
          source: 'quincy',
        },
        { onConflict: 'event_id,user_id' }
      )

    if (rsvpError) {
      console.error('Failed to RSVP:', rsvpError)
      setRsvpError(formatRsvpError(rsvpError))
      return false
    }

    localStorage.setItem('quincy_rsvp', 'true')
    localStorage.setItem('quincy_event_name', activeEvent.title || eventName)
    return true
  }

  const getActiveSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) return session
    const { data: { session: refreshed } } = await supabase.auth.refreshSession()
    return refreshed || null
  }

  const handleRsvpFree = async () => {
    try {
      setRsvpError(null)
      setIsRsvping(true)
      const session = await getActiveSession()

      if (!session?.user) {
        navigate('/auth', { state: { from: { pathname: '/event' } } })
        setIsRsvping(false)
        return
      }

      const activeEvent = event || await loadEvent()
      if (!activeEvent) {
        setRsvpError('No active event to RSVP for right now.')
        setIsRsvping(false)
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('display_name, instagram_handle')
        .eq('id', session.user.id)
        .maybeSingle()

      if (profileError) {
        console.error('Failed to fetch profile:', profileError)
      }

      if (!profile?.display_name) {
        setPendingUserId(session.user.id)
        const storedUser = localStorage.getItem('quincy_user')
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser)
            setDisplayName(parsed?.username || '')
          } catch (_) {
            setDisplayName('')
          }
        }
        setShowRsvpModal(true)
        setIsRsvping(false)
        return
      }

      const success = await finalizeRsvp({
        userId: session.user.id,
        activeEvent,
      })

      setIsRsvping(false)
    if (success) {
      setIsRsvped(true)
      setRsvpSuccess(true)
        setRsvpError(null)
      setTimeout(() => {
        navigate('/records')
      }, 700)
    }
    } catch (err) {
      console.error('RSVP error:', err)
      setRsvpError(formatRsvpError(err))
      setIsRsvping(false)
    }
  }

  const handleQuickRsvpSubmit = async () => {
    const trimmedName = displayName.trim()
    if (!trimmedName) {
      alert('Display name is required.')
      return
    }

    if (!pendingUserId) {
      alert('Missing user session. Please try again.')
      return
    }

    setIsRsvping(true)
    setRsvpError(null)
    const activeEvent = event || await loadEvent()
    if (!activeEvent) {
      setRsvpError('No active event to RSVP for right now.')
      setIsRsvping(false)
      return
    }

    const success = await finalizeRsvp({
      userId: pendingUserId,
      activeEvent,
      profilePayload: {
        display_name: trimmedName,
        instagram_handle: instagramHandle.trim() || null,
      },
    })

    setIsRsvping(false)
    if (success) {
      setIsRsvped(true)
      setRsvpSuccess(true)
      setRsvpError(null)
      setShowRsvpModal(false)
      setDisplayName('')
      setInstagramHandle('')
      setTimeout(() => {
        navigate('/records')
      }, 700)
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Vinyl Collectiv Events</h1>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, marginBottom: 20 }}>{eventName}</h2>

        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>
            Date & Time
          </p>
          <p style={{ fontSize: 15 }}>{dateLabel}</p>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>{timeLabel}</p>
        </div>

        <div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>
            Location
          </p>
          <p style={{ fontSize: 15 }}>{event?.venue_name || 'Vinyl Collectiv HQ'}</p>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>{event?.city || 'San Francisco, CA'}</p>
        </div>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>RSVP is free</h3>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Lock in your spot and start sharing the record you’re bringing.
        </p>
        {rsvpError && (
          <div style={{
            padding: '10px 12px',
            borderRadius: 12,
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            color: '#ef4444',
            fontSize: 13,
            marginBottom: 12,
          }}>
            {rsvpError}
          </div>
        )}
        {rsvpSuccess && (
          <div style={{
            padding: '10px 12px',
            borderRadius: 12,
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            color: '#059669',
            fontSize: 13,
            marginBottom: 12,
          }}>
            RSVP confirmed 🎉 See you there!
          </div>
        )}
        <button
          onClick={handleRsvpFree}
          disabled={isLoading || isRsvping || isRsvped}
          style={{
            width: '100%',
            backgroundColor: isRsvped ? '#16a34a' : undefined,
            color: isRsvped ? 'white' : undefined,
          }}
        >
          {isRsvped ? 'RSVP Confirmed 🎉' : (isRsvping ? 'Saving RSVP...' : 'RSVP Free')}
        </button>
      </div>

      <QuickRsvpModal
        isOpen={showRsvpModal}
        displayName={displayName}
        instagramHandle={instagramHandle}
        onDisplayNameChange={setDisplayName}
        onInstagramHandleChange={setInstagramHandle}
        onSubmit={handleQuickRsvpSubmit}
        onClose={() => setShowRsvpModal(false)}
        loading={isRsvping}
        error={null}
      />
    </div>
  )
}
