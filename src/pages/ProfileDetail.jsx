import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'

const getAllRecords = () => {
  const stored = localStorage.getItem('quincy_all_records')
  return stored ? JSON.parse(stored) : []
}

const getCurrentUser = () => {
  const user = localStorage.getItem('quincy_user')
  return user ? JSON.parse(user) : null
}

const getFollowingKey = (username) => `quincy_following_${username || 'Anonymous'}`

const readFollowing = (username) => {
  const stored = localStorage.getItem(getFollowingKey(username))
  return stored ? JSON.parse(stored) : []
}

const writeFollowing = (username, followingList) => {
  localStorage.setItem(getFollowingKey(username), JSON.stringify(followingList))
}

const buildTopAlbums = (records) => {
  const seen = new Set()
  const list = []
  records.forEach((record) => {
    const album = (record.album || '').trim()
    const artist = (record.artist || '').trim()
    const key = `${album}-${artist}`.toLowerCase()
    if (album && !seen.has(key)) {
      seen.add(key)
      list.push(artist ? `${album} - ${artist}` : album)
    }
  })
  return list
}

export default function ProfileDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const decodedId = decodeURIComponent(id || '')
  const records = getAllRecords()
  const userRecords = records.filter((record) => record.userId === decodedId)
  const topAlbums = buildTopAlbums(userRecords)
  const currentUser = getCurrentUser()
  const currentUserId = currentUser?.username || null
  const [following, setFollowing] = useState(readFollowing(currentUserId))
  const user = {
    name: decodedId || 'Unknown User',
    bio: userRecords.length > 0 ? `${userRecords.length} record${userRecords.length === 1 ? '' : 's'} uploaded` : 'No records uploaded yet.',
    topAlbums,
  }

  const isFollowing = currentUserId && following.includes(decodedId)
  const toggleFollow = () => {
    if (!currentUserId || !decodedId || currentUserId === decodedId) return
    const updated = isFollowing
      ? following.filter((idValue) => idValue !== decodedId)
      : [...following, decodedId]
    setFollowing(updated)
    writeFollowing(currentUserId, updated)
  }

  const handleConnect = () => {
    navigate(`/chat/${id}`)
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
        marginBottom: 24,
      }}>
        <div style={{
          width: 100,
          height: 100,
          borderRadius: '50%',
          backgroundColor: 'rgba(99, 102, 241, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 40,
        }}>
          👤
        </div>

        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>{user.name}</h1>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {user.bio}
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>Top Albums</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {user.topAlbums.map((album, index) => (
            <div
              key={index}
              style={{
                padding: '12px 14px',
                backgroundColor: 'var(--background)',
                borderRadius: 8,
                fontSize: 14,
              }}
            >
              {album}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button onClick={handleConnect}>
          💬 Connect
        </button>
        {currentUserId && currentUserId !== decodedId && (
          <button onClick={toggleFollow} className={isFollowing ? 'secondary' : ''}>
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        )}
        <Link to="/people">
          <button className="secondary">
            ← Back to People
          </button>
        </Link>
      </div>
    </div>
  )
}
