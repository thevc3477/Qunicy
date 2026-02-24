import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchSupabase } from '../lib/fetchSupabase'

export default function Matches() {
  const { user } = useAuth()
  const [pendingVibes, setPendingVibes] = useState([])
  const [connections, setConnections] = useState([])
  const [loading, setLoading] = useState(true)

  const loadVibes = async () => {
    if (!user) return
    setLoading(true)

    // Incoming pending vibes
    const { data: pending } = await fetchSupabase(
      `/rest/v1/vibes?receiver_id=eq.${user.id}&status=eq.pending&select=id,sender_id,record_id,created_at,sender:profiles!vibes_sender_id_fkey(display_name),record:vinyl_records(typed_album,typed_artist)&order=created_at.desc`
    )
    setPendingVibes(pending || [])

    // Accepted connections
    const { data: accepted } = await fetchSupabase(
      `/rest/v1/vibes?status=eq.accepted&or=(sender_id.eq.${user.id},receiver_id.eq.${user.id})&select=id,sender_id,receiver_id,record_id,sender:profiles!vibes_sender_id_fkey(display_name),receiver:profiles!vibes_receiver_id_fkey(display_name),record:vinyl_records(typed_album,typed_artist)&order=updated_at.desc`
    )

    const mapped = (accepted || []).map(v => {
      const issender = v.sender_id === user.id
      return {
        id: v.id,
        otherName: issender ? (v.receiver?.display_name || 'Someone') : (v.sender?.display_name || 'Someone'),
        album: v.record?.typed_album || '',
        artist: v.record?.typed_artist || '',
      }
    })
    setConnections(mapped)
    setLoading(false)
  }

  useEffect(() => { loadVibes() }, [user])

  const respondToVibe = async (vibeId, status) => {
    await fetchSupabase(`/rest/v1/vibes?id=eq.${vibeId}`, {
      method: 'PATCH',
      body: { status, updated_at: new Date().toISOString() },
    })
    loadVibes()
  }

  if (loading) {
    return <div style={{ padding: 20 }}><p style={{ color: 'var(--text-secondary)' }}>Loading connections...</p></div>
  }

  return (
    <div style={{ padding: 20, paddingBottom: 100 }}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Connections</h1>

      {/* Incoming Vibes */}
      {pendingVibes.length > 0 && (
        <>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>
            Incoming Vibes ✨
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {pendingVibes.map((v) => (
              <div key={v.id} className="card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    backgroundColor: 'rgba(139,92,246,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
                  }}>🎵</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: 15, margin: '0 0 2px', fontWeight: 600 }}>
                      {v.sender?.display_name || 'Someone'}
                    </h3>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                      vibed on {v.record?.typed_album || 'a record'} — {v.record?.typed_artist || ''}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => respondToVibe(v.id, 'accepted')}
                    style={{
                      flex: 1, padding: '10px 0', fontSize: 14, fontWeight: 600,
                      borderRadius: 8, border: 'none', backgroundColor: '#10b981', color: 'white', cursor: 'pointer',
                    }}
                  >Accept ✅</button>
                  <button
                    onClick={() => respondToVibe(v.id, 'declined')}
                    style={{
                      flex: 1, padding: '10px 0', fontSize: 14, fontWeight: 600,
                      borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
                    }}
                  >Decline ❌</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Active Connections */}
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>
        Your Connections 🎶
      </h2>
      {connections.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎶</div>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>No connections yet</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Browse the Vinyl Wall and send a vibe to someone whose taste you dig!
          </p>
          <Link to="/records"><button style={{ marginTop: 16 }}>Explore Records 💿</button></Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {connections.map((c) => (
            <Link to={`/chat/${c.id}`} key={c.id} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  backgroundColor: 'rgba(99,102,241,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
                }}>👤</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: 16, margin: '0 0 4px', fontWeight: 600 }}>{c.otherName}</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Connected on {c.album} — {c.artist}
                  </p>
                </div>
                <span style={{ fontSize: 14 }}>💬</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
