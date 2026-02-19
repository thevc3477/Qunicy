import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Matches() {
  const { user } = useAuth()
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasUploaded, setHasUploaded] = useState(false)

  useEffect(() => {
    if (!user) return
    const load = async () => {
      // Check if user has uploaded
      const { data: event } = await supabase
        .from('events').select('id').eq('is_active', true).limit(1).maybeSingle()
      if (event) {
        const { data: myRecord } = await supabase
          .from('vinyl_records').select('id').eq('event_id', event.id).eq('user_id', user.id).limit(1).maybeSingle()
        setHasUploaded(!!myRecord)
        if (!myRecord) { setLoading(false); return }
      }
      // Get matches where user is either user_a or user_b
      const { data: matchRows } = await supabase
        .from('matches')
        .select('id, user_a, user_b, created_at')
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (!matchRows?.length) { setLoading(false); return }

      // Get other user profiles and last message for each match
      const enriched = await Promise.all(
        matchRows.map(async (m) => {
          const otherId = m.user_a === user.id ? m.user_b : m.user_a
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('id', otherId)
            .maybeSingle()

          const { data: lastMsg } = await supabase
            .from('messages')
            .select('content, created_at')
            .eq('match_id', m.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          return {
            matchId: m.id,
            otherId,
            displayName: profile?.display_name || 'Someone',
            lastMessage: lastMsg?.content || 'Say hi! 👋',
            lastMessageTime: lastMsg?.created_at,
          }
        })
      )

      setMatches(enriched)
      setLoading(false)
    }
    load()
  }, [user])

  if (loading) {
    return <div style={{ padding: 20 }}><p style={{ color: 'var(--text-secondary)' }}>Loading matches...</p></div>
  }

  if (!hasUploaded) {
    return (
      <div style={{ padding: 20, paddingBottom: 100, minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ padding: 32, textAlign: 'center', maxWidth: 340 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
          <h2 style={{ fontSize: 20, marginBottom: 8 }}>Upload to Unlock Connections</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
            Once you share your record and start discovering, your connections will show up here. 🎶
          </p>
          <Link to="/records"><button style={{ width: '100%' }}>Upload Your Record</button></Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 20, paddingBottom: 100 }}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>Connections</h1>

      {matches.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎶</div>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>No connections yet</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            Keep discovering records — when you both vibe, you'll connect here!
          </p>
          <Link to="/swipe"><button style={{ marginTop: 16 }}>Discover Records 🔥</button></Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {matches.map((m) => (
            <Link to={`/chat/${m.matchId}`} key={m.matchId} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  backgroundColor: 'rgba(99,102,241,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
                }}>
                  👤
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: 16, margin: '0 0 4px', fontWeight: 600 }}>{m.displayName}</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.lastMessage}
                  </p>
                </div>
                <span style={{ fontSize: 16, color: 'var(--text-secondary)' }}>›</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
