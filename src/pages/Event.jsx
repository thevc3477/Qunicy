import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { fetchActiveEvent, upsertRsvp } from '../lib/rsvp'
import { downloadCalendarInvite } from '../lib/calendar'
import Walkthrough from '../components/Walkthrough'

export default function Event() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [event, setEvent] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRsvping, setIsRsvping] = useState(false)
  const [isRsvped, setIsRsvped] = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const [rsvpError, setRsvpError] = useState(null)
  const [attendeeCount, setAttendeeCount] = useState(0)

  useEffect(() => {
    const load = async () => {
      const { data } = await fetchActiveEvent()
      if (data) {
        setEvent(data)
        // Check RSVP status
        if (user) {
          const { data: rsvp } = await supabase
            .from('rsvps')
            .select('id')
            .eq('event_id', data.id)
            .eq('user_id', user.id)
            .maybeSingle()
          if (rsvp) setIsRsvped(true)
        }
        // Count attendees
        const { count } = await supabase
          .from('rsvps')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', data.id)
          .eq('status', 'going')
        setAttendeeCount(count || 0)
      }
      setIsLoading(false)
    }
    load()
  }, [user])

  const eventDate = event?.starts_at ? new Date(event.starts_at) : null
  const now = new Date()
  const daysAway = eventDate ? Math.max(0, Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24))) : null

  const handleRsvp = async () => {
    if (!user) {
      navigate('/auth', { state: { from: { pathname: '/event' } } })
      return
    }
    if (!event) return

    setIsRsvping(true)
    setRsvpError(null)

    const { error } = await upsertRsvp({ eventId: event.id, userId: user.id })
    if (error) {
      setRsvpError(error.message || 'Could not RSVP.')
      setIsRsvping(false)
      return
    }

    setIsRsvped(true)
    setCelebrating(true)
    setAttendeeCount(prev => prev + 1)

    setTimeout(() => {
      setCelebrating(false)
    }, 2000)
  }

  const dateLabel = eventDate
    ? eventDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : 'TBD'
  const timeLabel = eventDate
    ? eventDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : 'TBD'

  return (
    <div style={{ padding: 20 }}>
      {isRsvped && <Walkthrough />}
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Vinyl Collectiv</h1>

      {/* Countdown banner */}
      {event && (
        <div style={{
          textAlign: 'center', padding: '16px 20px', marginBottom: 20,
          background: 'linear-gradient(135deg, var(--primary-color), var(--primary-dark))',
          borderRadius: 16, color: 'white',
        }}>
          <p style={{ fontSize: 18, fontWeight: 700, margin: '0 0 4px 0' }}>
            🔥 {attendeeCount} people going {daysAway !== null && `· ${daysAway} day${daysAway === 1 ? '' : 's'} away`}
          </p>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 20, marginBottom: 20 }}>{event?.title || 'Upcoming Event'}</h2>
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Date & Time</p>
          <p style={{ fontSize: 15, margin: 0 }}>{dateLabel}</p>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: 0 }}>{timeLabel}</p>
        </div>
        <div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>Location</p>
          <p style={{ fontSize: 15, margin: 0 }}>{event?.venue_name || 'TBD'}</p>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: 0 }}>{event?.city || ''}</p>
        </div>
      </div>

      {/* Celebration overlay */}
      {celebrating && (
        <div className="rsvp-celebration">
          <div style={{ fontSize: 64 }}>🎉</div>
          <h2 style={{ fontSize: 24, color: 'white', marginTop: 16 }}>You're in!</h2>
          <p style={{ color: 'rgba(255,255,255,0.8)' }}>Taking you to upload your vinyl...</p>
        </div>
      )}

      <div className="card" style={{ padding: 16 }}>
        <h3 style={{ fontSize: 16, marginBottom: 8 }}>RSVP is free</h3>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Lock in your spot and start sharing the record you're bringing.
        </p>
        {rsvpError && (
          <div style={{ padding: '10px 12px', borderRadius: 12, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: 13, marginBottom: 12 }}>
            {rsvpError}
          </div>
        )}
        <button onClick={handleRsvp} disabled={isLoading || isRsvping || isRsvped}
          style={{ width: '100%', backgroundColor: isRsvped ? '#16a34a' : undefined }}>
          {isRsvped ? 'RSVP Confirmed 🎉' : (isRsvping ? 'Saving...' : 'RSVP Free')}
        </button>
        {isRsvped && event && (
          <button
            onClick={() => downloadCalendarInvite(event)}
            style={{
              width: '100%',
              marginTop: 10,
              backgroundColor: 'transparent',
              border: '1.5px solid var(--primary-color)',
              color: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            📅 Add to Calendar
          </button>
        )}
      </div>
    </div>
  )
}
