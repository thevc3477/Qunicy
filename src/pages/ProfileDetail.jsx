import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getVinylRecordImageUrl } from '../lib/vinylRecordUpload'
import { generateVibeCard } from '../lib/vibeCard'

export default function ProfileDetail() {
  const { id } = useParams()
  const [profile, setProfile] = useState(null)
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle()
      setProfile(prof)

      // Get their records for active event
      const { data: event } = await supabase.from('events').select('id').eq('is_active', true).limit(1).maybeSingle()
      if (event) {
        const { data: recs } = await supabase
          .from('vinyl_records')
          .select('id, typed_album, typed_artist, image_path')
          .eq('event_id', event.id)
          .eq('user_id', id)

        if (recs) {
          const withImages = await Promise.all(recs.map(async (r) => {
            const { url } = r.image_path ? await getVinylRecordImageUrl(r.image_path) : { url: null }
            return { ...r, imageUrl: url }
          }))
          setRecords(withImages)
        }
      }
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return <div style={{ padding: 20 }}><p style={{ color: 'var(--text-secondary)' }}>Loading...</p></div>
  }

  if (!profile) {
    return <div style={{ padding: 20 }}><p>Profile not found.</p><Link to="/event"><button className="secondary">← Back</button></Link></div>
  }

  const vibeCard = generateVibeCard(profile)

  return (
    <div style={{ padding: 20, paddingBottom: 100 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div style={{
          width: 100, height: 100, borderRadius: '50%',
          backgroundColor: 'rgba(99,102,241,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40,
        }}>
          👤
        </div>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>{profile.display_name || 'Anonymous'}</h1>
          {vibeCard && <p className="vibe-card-tag" style={{ fontSize: 13 }}>{vibeCard}</p>}
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 8 }}>
            {records.length} record{records.length !== 1 ? 's' : ''} for this event
          </p>
        </div>
      </div>

      {records.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>Their Records</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {records.map((r) => (
              <div key={r.id} className="card" style={{ padding: 12 }}>
                <div style={{
                  width: '100%', aspectRatio: '1', backgroundColor: 'rgba(99,102,241,0.1)',
                  borderRadius: 8, marginBottom: 8, overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {r.imageUrl ? <img src={r.imageUrl} alt={r.typed_album} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 32 }}>🎵</span>}
                </div>
                <h3 style={{ fontSize: 14, margin: '0 0 4px', fontWeight: 600 }}>{r.typed_album}</h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>{r.typed_artist}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link to="/event"><button className="secondary" style={{ width: '100%' }}>← Back</button></Link>
    </div>
  )
}
