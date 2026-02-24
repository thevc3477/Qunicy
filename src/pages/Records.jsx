import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getVinylRecordImageUrl } from '../lib/vinylRecordUpload'
import { useAuth } from '../context/AuthContext'
import { generateVibeCard } from '../lib/vibeCard'
import VinylRecordUpload from '../components/VinylRecordUpload'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Records() {
  const { user } = useAuth()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hasUploaded, setHasUploaded] = useState(false)
  const [records, setRecords] = useState([])
  const [showUpload, setShowUpload] = useState(false)
  const [error, setError] = useState(null)
  const [totalUploaders, setTotalUploaders] = useState(0)

  const loadData = async () => {
    if (!user) return
    setLoading(true)
    setError(null)

    const { data: ev } = await supabase
      .from('events')
      .select('id, title')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()
    setEvent(ev)
    if (!ev) { setLoading(false); return }

    const { data: allRecords, error: recErr } = await supabase
      .from('vinyl_records')
      .select('id, typed_album, typed_artist, image_path, image_url, user_id, created_at, profiles(display_name, music_identity, top_genres, event_intent)')
      .eq('event_id', ev.id)
      .order('created_at', { ascending: false })

    if (recErr) {
      setError('Could not load records.')
      setLoading(false)
      return
    }

    // Count unique uploaders
    const uniqueUsers = new Set((allRecords || []).map(r => r.user_id))
    setTotalUploaders(uniqueUsers.size)

    const userHasUploaded = (allRecords || []).some(r => r.user_id === user.id)
    setHasUploaded(userHasUploaded)

    const hydrated = await Promise.all(
      (allRecords || []).map(async (r) => {
        const imgPath = r.image_url || r.image_path
        if (!imgPath) return null
        const { url } = await getVinylRecordImageUrl(imgPath)
        if (!url) return null
        return {
          id: r.id,
          album: r.typed_album || '',
          artist: r.typed_artist || '',
          imageUrl: url,
          userId: r.user_id,
          displayName: r.profiles?.display_name || 'Vinyl lover',
          vibeCard: generateVibeCard(r.profiles),
        }
      })
    )
    setRecords(hydrated.filter(Boolean))
    setLoading(false)
  }

  useEffect(() => { loadData() }, [user])

  if (loading) return <LoadingSpinner />

  // LOCKED STATE: user hasn't uploaded yet
  if (!hasUploaded) {
    return (
      <div style={{ padding: 20, paddingBottom: 100 }}>
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>💿</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 12 }}>What are you spinning?</h1>
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 8 }}>
            Upload the record you're bringing to see what everyone else is vibing with
          </p>
          {totalUploaders > 0 && (
            <p style={{ fontSize: 14, color: 'var(--primary-color)', fontWeight: 600, marginBottom: 24 }}>
              🔥 {totalUploaders} {totalUploaders === 1 ? 'person has' : 'people have'} already shared their picks
            </p>
          )}
        </div>

        {/* Blurred preview hint */}
        {records.length > 0 && (
          <div style={{ position: 'relative', marginBottom: 24, overflow: 'hidden', borderRadius: 16, height: 160 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, filter: 'blur(12px)', opacity: 0.4, padding: 8 }}>
              {records.slice(0, 3).map((r, i) => (
                <div key={i} style={{ aspectRatio: '1', backgroundColor: 'rgba(99,102,241,0.2)', borderRadius: 10, overflow: 'hidden' }}>
                  {r.imageUrl && <img src={r.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
              ))}
            </div>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>🔒 Upload to unlock the wall</span>
            </div>
          </div>
        )}

        <div className="card" style={{ padding: 20, textAlign: 'center' }}>
          <p style={{ fontSize: 15, marginBottom: 16, fontWeight: 600 }}>📸 Share your vinyl pick</p>
          {event && <VinylRecordUpload eventId={event.id} userId={user?.id} onSuccess={loadData} />}
        </div>
      </div>
    )
  }

  // UNLOCKED STATE
  const myRecords = records.filter(r => r.userId === user.id)
  const otherRecords = records.filter(r => r.userId !== user.id)

  return (
    <div style={{ padding: 20, paddingBottom: 100 }}>
      <h1 style={{ fontSize: 24, marginBottom: 8, textAlign: 'center' }}>Vinyl Wall</h1>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20, textAlign: 'center' }}>
        See what everyone's bringing to the meetup
      </p>

      {/* Add more button */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setShowUpload(!showUpload)} style={{ flex: 1 }}>
          {showUpload ? 'Hide Upload' : '+ Add Another Record'}
        </button>
      </div>

      {showUpload && event && (
        <div className="card" style={{ padding: 16, marginBottom: 24 }}>
          <VinylRecordUpload eventId={event.id} userId={user?.id} onSuccess={() => { loadData(); setShowUpload(false) }} />
        </div>
      )}

      {error && (
        <div style={{ padding: '10px 12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 12, fontSize: 13, color: '#ef4444', marginBottom: 12 }}>
          {error}
        </div>
      )}

      {/* Your Picks */}
      {myRecords.length > 0 && (
        <>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>Your Pick{myRecords.length > 1 ? 's' : ''}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
            {myRecords.map((record) => (
              <RecordCard key={record.id} record={record} />
            ))}
          </div>
        </>
      )}

      {/* Everyone else */}
      {otherRecords.length > 0 && (
        <>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>Everyone Else</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {otherRecords.map((record) => (
              <RecordCard key={record.id} record={record} />
            ))}
          </div>
        </>
      )}

      {records.length === 0 && (
        <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>💿</div>
          <h2 style={{ fontSize: 18, marginBottom: 8, color: 'var(--text-primary)' }}>The wall is empty!</h2>
          <p style={{ fontSize: 14, lineHeight: 1.5 }}>Be the first to share what you're bringing 🎶</p>
        </div>
      )}
    </div>
  )
}

function RecordCard({ record }) {
  return (
    <Link to={`/records/${record.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="card" style={{ padding: 10 }}>
        <div style={{
          width: '100%', aspectRatio: '1', backgroundColor: 'rgba(99,102,241,0.1)',
          borderRadius: 10, marginBottom: 8, overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {record.imageUrl ? (
            <img src={record.imageUrl} alt={record.album} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 32 }}>🎵</span>
          )}
        </div>
        <h3 style={{ fontSize: 13, margin: '0 0 2px 0', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {record.album}
        </h3>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 6px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {record.artist}
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '0 0 2px 0', fontWeight: 500 }}>
          {record.displayName}
        </p>
        {record.vibeCard && (
          <p className="vibe-card-tag" style={{ fontSize: 10, margin: 0 }}>
            {record.vibeCard}
          </p>
        )}
      </div>
    </Link>
  )
}
