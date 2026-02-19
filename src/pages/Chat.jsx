import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Chat() {
  const { matchId } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [otherUser, setOtherUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [iceBreaker, setIceBreaker] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!user || !matchId) return

    const load = async () => {
      // Get match info
      const { data: match } = await supabase
        .from('matches')
        .select('id, user_a, user_b')
        .eq('id', matchId)
        .maybeSingle()

      if (!match) { setLoading(false); return }

      const otherId = match.user_a === user.id ? match.user_b : match.user_a
      const { data: otherProfile } = await supabase
        .from('profiles')
        .select('display_name, top_genres, music_identity')
        .eq('id', otherId)
        .maybeSingle()

      setOtherUser(otherProfile)

      // Generate ice breaker from shared genres
      if (profile?.top_genres && otherProfile?.top_genres) {
        const shared = profile.top_genres.filter(g => otherProfile.top_genres?.includes(g))
        if (shared.length > 0) {
          const genreLabels = shared.map(g => g.replace('_', '/'))
          setIceBreaker(`You both vibe with ${genreLabels.join(' & ')}! 🎵`)
        }
      }

      // Load existing messages
      const { data: msgs } = await supabase
        .from('messages')
        .select('id, sender_id, content, created_at')
        .eq('match_id', matchId)
        .order('created_at', { ascending: true })

      setMessages(msgs || [])
      setLoading(false)
    }
    load()

    // Subscribe to realtime
    const channel = supabase
      .channel(`messages:${matchId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${matchId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, matchId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !user) return

    const content = newMessage.trim()
    setNewMessage('')

    await supabase.from('messages').insert({
      match_id: matchId,
      sender_id: user.id,
      content,
    })
  }

  const formatTime = (ts) => {
    if (!ts) return ''
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 130px)', backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <div style={{ padding: 16, backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/matches')}
          style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: 4, width: 'auto', minHeight: 'auto' }}>
          ←
        </button>
        <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
          👤
        </div>
        <h2 style={{ fontSize: 18, margin: 0 }}>{otherUser?.display_name || 'Chat'}</h2>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Ice breaker */}
        {iceBreaker && (
          <div style={{ textAlign: 'center', padding: '12px 16px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 13, color: '#FFFFFF', marginBottom: 8 }}>
            {iceBreaker}
          </div>
        )}

        {loading ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Loading...</p>
        ) : messages.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: 14 }}>No messages yet. Say hi! 👋</p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user?.id
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '75%',
                  backgroundColor: isMe ? 'var(--primary-color)' : 'var(--surface)',
                  color: isMe ? 'white' : 'var(--text-primary)',
                  padding: '10px 14px', borderRadius: 16,
                  borderBottomRightRadius: isMe ? 4 : 16,
                  borderBottomLeftRadius: isMe ? 16 : 4,
                }}>
                  <p style={{ margin: '0 0 4px 0', fontSize: 15 }}>{msg.content}</p>
                  <p style={{ margin: 0, fontSize: 11, opacity: 0.7, textAlign: 'right' }}>
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} style={{ padding: 16, backgroundColor: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
        <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          style={{ flex: 1, padding: '12px 16px', fontSize: 15, borderRadius: 24, border: '1px solid var(--border)', backgroundColor: 'var(--background)', outline: 'none' }} />
        <button type="submit" style={{ width: 48, minHeight: 48, borderRadius: '50%', padding: 0, fontSize: 20 }}>↑</button>
      </form>
    </div>
  )
}
