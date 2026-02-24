import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getVinylRecordImageUrl } from '../lib/vinylRecordUpload'
import { useAuth } from '../context/AuthContext'
import { generateVibeCard } from '../lib/vibeCard'
import VinylRecordUpload from '../components/VinylRecordUpload'

export default function Records() {
  const { user } = useAuth()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hasUploaded, setHasUploaded] = useState(false)
  const [records, setRecords] = useState([])
  const [showUpload, setShowUpload] = useState(false)
  const [error, setError] = useState(null)

  const loadData = async () => {
    if (!user) return
    setLoading(true)
    setError(null)

    // Get active event
    const { data: ev } = await supabase
      .from('events')
      .select('id, title')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()
    setEvent(ev)
    if (!ev) { setLoading(false); return }

    // Check if user uploaded
    const { data: myRecord } = await supabase
      .from('vinyl_records')
      .select('id')
      .eq('event_id', ev.id)
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()
    setHasUploaded(!!myRecord)

    // Load all records for event
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

  if (loading) {
    return <div style={{ padding: 20 }}><p style={{ color: 'var(--text-secondary)' }}>Loading records...</p></div>
  }

  return (
    <div style={{ padding: 20, paddingBottom: 100 }}>
      <h1 style={{ fontSize: 24, marginBottom: 8, textAlign: 'center' }}>Vinyl Wall</h1>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16, textAlign: 'center' }}>
        See what everyone's bringing to the meetup.
      </p>

      {/* Upload section */}
      {!hasUploaded ? (
        <div className="card" style={{ padding: 16, marginBottom: 24, textAlign: 'center' }}>
          <p style={{ fontSize: 15, marginBottom: 12 }}>📸 Upload the vinyl you're bringing</p>
          {event && <VinylRecordUpload eventId={event.id} onSuccess={loadData} />}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button onClick={() => setShowUpload(!showUpload)} style={{ flex: 1 }}>
            {showUpload ? 'Hide Upload' : '+ Upload Another'}
          </button>
        </div>
      )}

      {showUpload && event && (
        <div className="card" style={{ padding: 16, marginBottom: 24 }}>
          <VinylRecordUpload eventId={event.id} onSuccess={() => { loadData(); setShowUpload(false) }} />
        </div>
      )}

      {error && (
        <div style={{ padding: '10px 12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 12, fontSize: 13, color: '#ef4444', marginBottom: 12 }}>
          {error}
        </div>
      )}

      {/* Vinyl Wall Grid */}
      {records.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>💿</div>
          <h2 style={{ fontSize: 18, marginBottom: 8, color: 'var(--text-primary)' }}>The wall is empty!</h2>
          <p style={{ fontSize: 14, lineHeight: 1.5 }}>Be the first to share what you're bringing. Upload your record and get the wall started! 🎶</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {records.map((record) => (
            <Link to={`/records/${record.id}`} key={record.id} style={{ textDecoration: 'none', color: 'inherit' }}>
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
          ))}
        </div>
      )}
    </div>
  )
}
