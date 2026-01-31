import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getVinylRecordImageUrl } from '../lib/vinylRecordUpload'
import VinylRecordUpload from '../components/VinylRecordUpload'
import QuickRsvpModal from '../components/QuickRsvpModal'

const formatHandle = (value) => {
  const trimmed = (value || '').trim()
  if (!trimmed) return 'a collector'
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`
}

export default function Records() {
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rsvpStatus, setRsvpStatus] = useState('checking')
  const [hasUploaded, setHasUploaded] = useState(false)
  const [records, setRecords] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [error, setError] = useState(null)
  const [showUpload, setShowUpload] = useState(false)

  const [isRsvping, setIsRsvping] = useState(false)
  const [showRsvpModal, setShowRsvpModal] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [instagramHandle, setInstagramHandle] = useState('')
  const [pendingUserId, setPendingUserId] = useState(null)
  const [rsvpSuccess, setRsvpSuccess] = useState(false)

  const [summaryById, setSummaryById] = useState({})
  const [summaryOpenId, setSummaryOpenId] = useState(null)
  const [summaryLoadingId, setSummaryLoadingId] = useState(null)
  const [interestRecordId, setInterestRecordId] = useState(null)

  const loadActiveEvent = async () => {
    const { data, error: eventError } = await supabase
      .from('events')
      .select('id, title, starts_at, venue_name, city, is_active')
      .eq('is_active', true)
      .order('starts_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (eventError) {
      console.error('Failed to load event:', eventError)
      setError('Could not load the active event.')
    }
    if (data) {
      setEvent(data)
    }
    return data
  }

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
        setError(formatRsvpError(profileError))
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
      setError(formatRsvpError(rsvpError))
      return false
    }

    localStorage.setItem('quincy_rsvp', 'true')
    localStorage.setItem('quincy_event_name', activeEvent.title || 'Vinyl Collectiv Event')
    return true
  }

  const loadRecords = async (activeEventId, userId) => {
    setError(null)
    const { data, error: recordsError } = await supabase
      .from('vinyl_records')
      .select('id, typed_album, typed_artist, image_path, user_id, created_at, profiles(display_name, instagram_handle)')
      .eq('event_id', activeEventId)
      .order('created_at', { ascending: false })

    if (recordsError) {
      console.error('Failed to load records:', recordsError)
      setError('Could not load records yet.')
      return
    }

    const hydrated = await Promise.all(
      (data || []).map(async (record) => {
        if (!record?.image_path) return null
        const { url } = await getVinylRecordImageUrl(record.image_path)
        if (!url) return null
        return {
          id: record.id,
          album: record.typed_album || '',
          artist: record.typed_artist || '',
          imageUrl: url,
          userId: record.user_id,
          displayName: record.profiles?.display_name || record.profiles?.instagram_handle || '',
        }
      })
    )

    const filtered = hydrated
      .filter(Boolean)
      .filter((record) => (userId ? record.userId !== userId : true))

    setRecords(filtered)
    setCurrentIndex(0)
  }

  const refreshUploadAndFeed = async (activeEventId, userId) => {
    if (!activeEventId || !userId) {
      return
    }
    const { data } = await supabase
      .from('vinyl_records')
      .select('id')
      .eq('event_id', activeEventId)
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()

    const uploaded = Boolean(data)
    setHasUploaded(uploaded)
    if (uploaded) {
      localStorage.setItem('quincy_uploaded_record', 'true')
    }
    
    // Load other people's records (exclude user's own)
    await loadRecords(activeEventId, userId)
  }

  const getActiveSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) return session
    const { data: { session: refreshed } } = await supabase.auth.refreshSession()
    return refreshed || null
  }

  const handleRsvpFree = async () => {
    setIsRsvping(true)
    setError(null)
    const session = await getActiveSession()

    if (!session?.user) {
      navigate('/auth', { state: { from: { pathname: '/records' } } })
      setIsRsvping(false)
      return
    }

    const activeEvent = event || await loadActiveEvent()
    if (!activeEvent) {
      setError('No active event to RSVP for right now.')
      setIsRsvping(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, instagram_handle')
      .eq('id', session.user.id)
      .maybeSingle()

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
      } else {
        setDisplayName('')
      }
      setInstagramHandle(profile?.instagram_handle || '')
      setShowRsvpModal(true)
      setIsRsvping(false)
      return
    }

    const success = await finalizeRsvp({
      userId: session.user.id,
      activeEvent,
    })

    if (success) {
      setRsvpStatus('rsvped')
      setRsvpSuccess(true)
      await refreshUploadAndFeed(activeEvent.id, session.user.id)
      setShowUpload(true)
    }
    setIsRsvping(false)
  }

  const handleQuickRsvpSubmit = async () => {
    const trimmedName = displayName.trim()
    if (!trimmedName || !pendingUserId) {
      setError('Display name is required.')
      return
    }

    setIsRsvping(true)
    const activeEvent = event || await loadActiveEvent()
    if (!activeEvent) {
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

    if (success) {
      setShowRsvpModal(false)
      setRsvpStatus('rsvped')
      setRsvpSuccess(true)
      await refreshUploadAndFeed(activeEvent.id, pendingUserId)
      setShowUpload(true)
    }
    setIsRsvping(false)
  }

  const handleSkip = () => {
    if (!records.length) return
    setSummaryOpenId(null)
    setInterestRecordId(null)
    setCurrentIndex((prev) => (prev + 1) % records.length)
  }

  const handleInterested = (recordId) => {
    setInterestRecordId(recordId)
  }

  const handleSummary = async (record) => {
    if (!record?.album || !record?.artist) return

    if (summaryById[record.id]) {
      setSummaryOpenId(record.id)
      return
    }

    setSummaryLoadingId(record.id)
    try {
      const supabaseUrl = supabase.supabaseUrl || import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = supabase.supabaseKey || import.meta.env.VITE_SUPABASE_ANON_KEY

      const response = await fetch(`${supabaseUrl}/functions/v1/album-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          album: record.album,
          artist: record.artist,
        }),
      })

      const payload = await response.json()
      if (!response.ok || payload?.error) {
        throw new Error(payload?.error || 'Summary unavailable')
      }

      setSummaryById((prev) => ({ ...prev, [record.id]: payload }))
      setSummaryOpenId(record.id)
    } catch (err) {
      console.error('Summary error:', err)
      setSummaryById((prev) => ({
        ...prev,
        [record.id]: { error: 'Could not load summary yet.' },
      }))
      setSummaryOpenId(record.id)
    } finally {
      setSummaryLoadingId(null)
    }
  }

  useEffect(() => {
    let isMounted = true

    const bootstrap = async () => {
      setLoading(true)
      const activeEvent = await loadActiveEvent()
      const { data: { session } } = await supabase.auth.getSession()

      if (!isMounted) return
      setUser(session?.user || null)

      if (!activeEvent) {
        setLoading(false)
        return
      }

      if (!session?.user) {
        setRsvpStatus('not_rsvped')
        setLoading(false)
        return
      }

      const { data: rsvp } = await supabase
        .from('rsvps')
        .select('status')
        .eq('event_id', activeEvent.id)
        .eq('user_id', session.user.id)
        .maybeSingle()

      const isRsvped = rsvp?.status === 'going'
      setRsvpStatus(isRsvped ? 'rsvped' : 'not_rsvped')
      if (isRsvped) {
        localStorage.setItem('quincy_rsvp', 'true')
        await refreshUploadAndFeed(activeEvent.id, session.user.id)
      }

      setLoading(false)
    }

    bootstrap()

    return () => {
      isMounted = false
    }
  }, [])

  const activeRecord = records[currentIndex]
  const activeSummary = activeRecord ? summaryById[activeRecord.id] : null

  if (loading) {
    return (
      <div style={{ padding: 20 }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading records...</p>
      </div>
    )
  }

  if (rsvpStatus === 'not_rsvped') {
    return (
      <div style={{ padding: 20, paddingBottom: 100 }}>
        <h1 style={{ fontSize: 24, marginBottom: 16 }}>Records</h1>
        <div className="card" style={{ padding: 18 }}>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>RSVP to unlock records</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
            RSVP is free and happens inside Quincy.
          </p>
          {rsvpSuccess && (
            <div style={{
              padding: '10px 12px',
              borderRadius: 12,
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              color: '#059669',
              fontSize: 13,
              marginBottom: 12,
            }}>
              RSVP confirmed 🎉 Upload a record to unlock the feed.
            </div>
          )}
          {error && (
            <p style={{ fontSize: 13, color: '#ef4444', marginBottom: 12 }}>
              {error}
            </p>
          )}
          <button onClick={handleRsvpFree} disabled={isRsvping} style={{ width: '100%' }}>
            {isRsvping ? 'RSVPing...' : 'RSVP Free'}
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

  // Show records feed once RSVP'd
  return (
    <div style={{ padding: 20, paddingBottom: 100 }}>
      <h1 style={{ fontSize: 24, marginBottom: 8, textAlign: 'center' }}>Records</h1>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16, fontWeight: 600, textAlign: 'center' }}>
        Share the vinyl you're bringing to this meetup.
      </p>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => navigate('/me')}
          className="secondary"
          style={{ flex: 1 }}
        >
          View Your Records
        </button>
        <button
          onClick={() => setShowUpload(!showUpload)}
          style={{ flex: 1 }}
        >
          {showUpload ? 'Hide Upload' : '+ Upload Record'}
        </button>
      </div>

      {/* Upload form */}
      {showUpload && event?.id && (
        <div className="card" style={{ padding: 16, marginBottom: 24 }}>
          <VinylRecordUpload eventId={event.id} onSuccess={() => {
            refreshUploadAndFeed(event.id, user?.id)
            setShowUpload(false)
          }} />
        </div>
      )}

      {error && (
        <div style={{
          padding: '10px 12px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderRadius: 12,
          fontSize: 13,
          color: '#ef4444',
          marginBottom: 12,
        }}>
          {error}
        </div>
      )}

      {/* Tinder-style feed */}
      {records.length === 0 ? (
        <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💿</div>
          <p style={{ fontSize: 15, marginBottom: 8 }}>No other records yet</p>
          <p style={{ fontSize: 13 }}>Check back when others upload!</p>
        </div>
      ) : (
        <div>
          <div className="card" style={{ padding: 12, marginBottom: 16 }}>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
              Uploaded by {formatHandle(activeRecord?.displayName)}
            </p>
            <div style={{
              width: '100%',
              aspectRatio: '1',
              borderRadius: 16,
              overflow: 'hidden',
              backgroundColor: 'rgba(99, 102, 241, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}>
              {activeRecord?.imageUrl ? (
                <img
                  src={activeRecord.imageUrl}
                  alt={activeRecord.album || 'Record cover'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: 48 }}>🎵</span>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <button
                className="secondary"
                onClick={handleSkip}
                style={{ flex: 1, fontSize: 18 }}
              >
                ❌
              </button>
              <button
                className="secondary"
                onClick={() => handleSummary(activeRecord)}
                style={{ flex: 1, fontSize: 18 }}
                disabled={!activeRecord?.album || !activeRecord?.artist || summaryLoadingId === activeRecord?.id}
              >
                {summaryLoadingId === activeRecord?.id ? '⏳' : '❓'}
              </button>
              <button
                onClick={() => handleInterested(activeRecord?.id)}
                style={{ flex: 1, fontSize: 18 }}
              >
                ✅
              </button>
            </div>
          </div>

          {summaryOpenId === activeRecord?.id && (
            <div className="card" style={{ padding: 16, marginBottom: 16 }}>
              {activeSummary?.error ? (
                <p style={{ fontSize: 13, color: '#ef4444' }}>{activeSummary.error}</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Album info</p>
                    <p style={{ fontSize: 14, margin: 0 }}>{activeSummary?.album_info}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>History</p>
                    <p style={{ fontSize: 14, margin: 0 }}>{activeSummary?.history}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Fun facts</p>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {(activeSummary?.fun_facts || []).map((fact, index) => (
                        <li key={index} style={{ fontSize: 14, marginBottom: 4 }}>{fact}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {interestRecordId === activeRecord?.id && (
            <div className="card" style={{ padding: 16 }}>
              <p style={{ fontSize: 15, marginBottom: 12 }}>
                You should meet this person at the meetup.
              </p>
              <button
                onClick={() => activeRecord?.userId && navigate(`/chat/${encodeURIComponent(activeRecord.userId)}`)}
                style={{ width: '100%' }}
              >
                Start chat
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
