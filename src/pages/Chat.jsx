import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

const getAllRecords = () => {
  const stored = localStorage.getItem('quincy_all_records')
  return stored ? JSON.parse(stored) : []
}

const getUserName = (userId) => {
  const records = getAllRecords()
  const match = records.find((record) => record.userId === userId)
  return match?.userId || userId
}

export default function Chat() {
  const { id } = useParams()
  const navigate = useNavigate()
  const decodedId = decodeURIComponent(id || '')
  const user = { name: getUserName(decodedId) || 'Unknown User' }

  const [messages, setMessages] = useState([
    { from: 'them', text: `Hey! Thanks for connecting!`, time: '2:30 PM' }
  ])
  const [newMessage, setNewMessage] = useState('')

  const handleSend = (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    setMessages([...messages, {
      from: 'me',
      text: newMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }])
    setNewMessage('')

    // Simulate response (in real app, this would be real-time messaging)
    setTimeout(() => {
      setMessages(prev => [...prev, {
        from: 'them',
        text: 'This is a placeholder response. Real messaging requires backend!',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }])
    }, 1000)
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 130px)',
      backgroundColor: 'var(--background)',
    }}>
      {/* Header */}
      <div style={{
        padding: 16,
        backgroundColor: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 20,
            cursor: 'pointer',
            padding: 4,
            width: 'auto',
            minHeight: 'auto',
          }}
        >
          ←
        </button>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          backgroundColor: 'rgba(99, 102, 241, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
        }}>
          👤
        </div>
        <h2 style={{ fontSize: 18, margin: 0 }}>{user.name}</h2>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: msg.from === 'me' ? 'flex-end' : 'flex-start',
            }}
          >
            <div style={{
              maxWidth: '75%',
              backgroundColor: msg.from === 'me' ? 'var(--primary-color)' : 'var(--surface)',
              color: msg.from === 'me' ? 'white' : 'var(--text-primary)',
              padding: '10px 14px',
              borderRadius: 16,
              borderBottomRightRadius: msg.from === 'me' ? 4 : 16,
              borderBottomLeftRadius: msg.from === 'me' ? 16 : 4,
            }}>
              <p style={{ margin: '0 0 4px 0', fontSize: 15 }}>{msg.text}</p>
              <p style={{
                margin: 0,
                fontSize: 11,
                opacity: 0.7,
                textAlign: 'right'
              }}>
                {msg.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        style={{
          padding: 16,
          backgroundColor: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          gap: 8,
        }}
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: '12px 16px',
            fontSize: 15,
            borderRadius: 24,
            border: '1px solid var(--border)',
            backgroundColor: 'var(--background)',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          style={{
            width: 48,
            minHeight: 48,
            borderRadius: '50%',
            padding: 0,
            fontSize: 20,
          }}
        >
          ↑
        </button>
      </form>
    </div>
  )
}
