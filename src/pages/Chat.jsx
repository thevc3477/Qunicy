import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { fetchSupabase } from '../lib/fetchSupabase'

export default function Chat() {
  const { matchId: vibeId } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [otherUser, setOtherUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [accessDenied, setAccessDenied] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!user || !vibeId) return

    const load = async () => {
      // Load vibe
      const { data: vibes } = await fetchSupabase(
        `/rest/v1/vibes?id=eq.${vibeId}&select=id,sender_id,receiver_id,status`
      )
      const vibe = vibes?.[0]
      if (!vibe || vibe.status !== 'accepted') {
        setAccessDenied(true)
        setLoading(false)
        return
      }

      const otherId = vibe.sender_id === user.id ? vibe.receiver_id : vibe.sender_id
      const { data: profiles } = await fetchSupabase(
        `/rest/v1/profiles?id=eq.${otherId}&select=display_name,top_genres,music_identity`
      )
      const otherProfile = profiles?.[0]
      setOtherUser(otherProfile)

      // Load messages
      const { data: msgs } = await fetchSupabase(
        `/rest/v1/messages?vibe_id=eq.${vibeId}&select=id,sender_id,content,created_at&order=created_at.asc`
      )
      setMessages(msgs || [])
      setLoading(false)
    }
    load()

    // Subscribe to realtime
    const channel = supabase
      .channel(`messages:${vibeId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `vibe_id=eq.${vibeId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, vibeId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !user) return

    const content = newMessage.trim()
    setNewMessage('')

    await fetchSupabase('/rest/v1/messages', {
      method: 'POST',
      body: {
        vibe_id: vibeId,
        sender_id: user.id,
        content,
      },
    })
  }

  const formatTime = (ts) => {
    if (!ts) return ''
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (accessDenied) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <p style={{ color: 'var(--text-secondary)' }}>This chat isn't available.</p>
        <button onClick={() => navigate('/matches')} style={{ marginTop: 16 }}>Back to Connections</button>
      </div>
    )
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
