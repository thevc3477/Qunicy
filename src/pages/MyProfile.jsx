import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getVinylRecordImageUrl } from '../lib/vinylRecordUpload'
import { generateVibeCard } from '../lib/vibeCard'

export default function MyProfile() {
  const { user, profile, refreshProfile } = useAuth()
  const [records, setRecords] = useState([])
  const [matchCount, setMatchCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [newDisplayName, setNewDisplayName] = useState('')

  useEffect(() => {
    if (!user) return
    const load = async () => {
      // Avatar
      if (profile?.avatar_url) {
        const { data } = await supabase.storage.from('records').createSignedUrl(profile.avatar_url, 3600)
        if (data?.signedUrl) setProfilePhotoUrl(data.signedUrl)
      }

      // Active event records
      const { data: event } = await supabase.from('events').select('id').eq('is_active', true).limit(1).maybeSingle()
      if (event) {
        const { data: recs } = await supabase.from('vinyl_records').select('*').eq('event_id', event.id).eq('user_id', user.id)
        if (recs) {
          const withImages = await Promise.all(recs.map(async (r) => {
            const { url } = await getVinylRecordImageUrl(r.image_path)
            return { ...r, imageUrl: url }
          }))
          setRecords(withImages)
        }
      }

      // Match count
      const { count } = await supabase
        .from('matches')
        .select('id', { count: 'exact', head: true })
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      setMatchCount(count || 0)

      setLoading(false)
    }
    load()
  }, [user, profile])

  const handleUpdateDisplayName = async () => {
    if (!user || !newDisplayName.trim()) return
    await supabase.from('profiles').update({ display_name: newDisplayName.trim() }).eq('id', user.id)
    await refreshProfile()
    setEditingName(false)
    setNewDisplayName('')
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    const ext = file.name.split('.').pop()
    const path = `profile-photos/${user.id}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('records').upload(path, file)
    if (!error) {
      await supabase.from('profiles').update({ avatar_url: path }).eq('id', user.id)
      await refreshProfile()
      const { data } = await supabase.storage.from('records').createSignedUrl(path, 3600)
      if (data?.signedUrl) setProfilePhotoUrl(data.signedUrl)
    }
  }

  if (loading) {
    return <div style={{ padding: 20 }}><p style={{ color: 'var(--text-secondary)' }}>Loading...</p></div>
  }

  const displayName = profile?.display_name || 'Anonymous'
  const vibeCard = generateVibeCard(profile)

  return (
    <div style={{ padding: 20, paddingBottom: 100 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => setShowSettings(!showSettings)} className="secondary"
          style={{ padding: '6px 10px', fontSize: 16 }}>
          {showSettings ? '✕' : '⚙️'}
        </button>
      </div>

      {showSettings && (
        <div className="card" style={{ padding: 16, marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, marginBottom: 16, fontWeight: 600 }}>Settings</h3>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Display Name</label>
            {editingName ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" value={newDisplayName} onChange={(e) => setNewDisplayName(e.target.value)} placeholder={displayName}
                  style={{ flex: 1, padding: '8px 12px', fontSize: 14, borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--surface)' }} />
                <button onClick={handleUpdateDisplayName} style={{ padding: '8px 16px', fontSize: 13 }}>Save</button>
                <button onClick={() => { setEditingName(false); setNewDisplayName('') }} className="secondary" style={{ padding: '8px 16px', fontSize: 13 }}>Cancel</button>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: 15, margin: 0 }}>{displayName}</p>
                <button onClick={() => { setEditingName(true); setNewDisplayName(displayName) }} className="secondary" style={{ padding: '6px 12px', fontSize: 13 }}>Edit</button>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Profile Photo</label>
            <label htmlFor="settings-photo" className="secondary" style={{ display: 'inline-block', padding: '8px 12px', fontSize: 13, cursor: 'pointer' }}>
              {profilePhotoUrl ? 'Change Photo' : 'Upload Photo'}
            </label>
            <input id="settings-photo" type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
          </div>

          <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/' }}
            style={{ width: '100%', padding: '10px 16px', fontSize: 14, backgroundColor: '#ef4444', color: 'white', borderRadius: 8, fontWeight: 600 }}>
            Sign Out
          </button>
        </div>
      )}

      {/* Profile header */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div style={{
          width: 100, height: 100, borderRadius: '50%',
          backgroundColor: 'rgba(99,102,241,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 40, overflow: 'hidden',
        }}>
          {profilePhotoUrl ? (
            <img src={profilePhotoUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : '👤'}
        </div>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>{displayName}</h1>
          {vibeCard && <p className="vibe-card-tag" style={{ fontSize: 13 }}>{vibeCard}</p>}
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 8 }}>
            {records.length} record{records.length !== 1 ? 's' : ''} · {matchCount} match{matchCount !== 1 ? 'es' : ''}
          </p>
        </div>
      </div>

      {/* Records */}
      <h2 style={{ fontSize: 18, marginBottom: 12 }}>Your Records</h2>
      {records.length === 0 ? (
        <div className="card" style={{ padding: 16, textAlign: 'center', color: 'var(--text-secondary)' }}>No records uploaded yet.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {records.map((r) => (
            <div key={r.id} className="card" style={{ padding: 12 }}>
              <div style={{ width: '100%', aspectRatio: '1', backgroundColor: 'rgba(99,102,241,0.1)', borderRadius: 8, marginBottom: 8, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {r.imageUrl ? <img src={r.imageUrl} alt={r.typed_album} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 32 }}>🎵</span>}
              </div>
              <h3 style={{ fontSize: 14, margin: '0 0 4px', fontWeight: 600 }}>{r.typed_album}</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>{r.typed_artist}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
