import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

const normalize = (value) => (value || '').trim().toLowerCase()

const getAllRecords = () => {
  const stored = localStorage.getItem('quincy_all_records')
  return stored ? JSON.parse(stored) : []
}

const getFollowingKey = (username) => `quincy_following_${username || 'Anonymous'}`

const readFollowing = (username) => {
  const stored = localStorage.getItem(getFollowingKey(username))
  return stored ? JSON.parse(stored) : []
}

const writeFollowing = (username, followingList) => {
  localStorage.setItem(getFollowingKey(username), JSON.stringify(followingList))
}

const buildUserStats = (records) => {
  const albums = []
  const artists = []
  const seenAlbums = new Set()
  const seenArtists = new Set()

  records.forEach((record) => {
    const album = (record.album || '').trim()
    const artist = (record.artist || '').trim()
    const albumKey = normalize(album)
    const artistKey = normalize(artist)

    if (album && !seenAlbums.has(albumKey)) {
      seenAlbums.add(albumKey)
      albums.push(album)
    }
    if (artist && !seenArtists.has(artistKey)) {
      seenArtists.add(artistKey)
      artists.push(artist)
    }
  })

  return {
    albums,
    artists,
    albumKeys: seenAlbums,
    artistKeys: seenArtists,
  }
}

const computeSimilarity = (base, candidate) => {
  let sharedAlbums = 0
  let sharedArtists = 0

  base.albumKeys.forEach((album) => {
    if (candidate.albumKeys.has(album)) {
      sharedAlbums += 1
    }
  })

  base.artistKeys.forEach((artist) => {
    if (candidate.artistKeys.has(artist)) {
      sharedArtists += 1
    }
  })

  const score = sharedAlbums * 3 + sharedArtists * 2

  return { score, sharedAlbums, sharedArtists }
}

export default function People() {
  const navigate = useNavigate()
  const [attendees, setAttendees] = useState([])
  const [matches, setMatches] = useState([])
  const [currentUserId, setCurrentUserId] = useState(null)
  const [following, setFollowing] = useState([])

  const handleConnect = (personId) => {
    navigate(`/chat/${encodeURIComponent(personId)}`)
  }

  useEffect(() => {
    const records = getAllRecords()
    const user = localStorage.getItem('quincy_user')
    const currentUser = user ? JSON.parse(user) : null
    const currentId = currentUser?.username || null
    setCurrentUserId(currentId)
    setFollowing(readFollowing(currentId))

    const recordsByUser = records.reduce((acc, record) => {
      const key = record.userId || 'Anonymous'
      if (!acc[key]) acc[key] = []
      acc[key].push(record)
      return acc
    }, {})

    const peopleList = Object.entries(recordsByUser).map(([userId, userRecords]) => {
      const stats = buildUserStats(userRecords)
      return {
        id: userId,
        name: userId,
        stats,
      }
    })

    const filteredAttendees = currentId
      ? peopleList.filter((person) => person.id !== currentId)
      : peopleList

    setAttendees(filteredAttendees)

    if (!currentId || !recordsByUser[currentId]) {
      setMatches([])
      return
    }

    const currentStats = buildUserStats(recordsByUser[currentId])
    const matchCandidates = filteredAttendees
      .map((person) => {
        const similarity = computeSimilarity(currentStats, person.stats)
        return {
          ...person,
          similarity,
        }
      })
      .filter((person) => person.similarity.score > 0)
      .sort((a, b) => {
        if (b.similarity.score !== a.similarity.score) {
          return b.similarity.score - a.similarity.score
        }
        return a.name.localeCompare(b.name)
      })

    setMatches(matchCandidates)
  }, [])

  const toggleFollow = (personId) => {
    if (!currentUserId) return
    const updated = following.includes(personId)
      ? following.filter((id) => id !== personId)
      : [...following, personId]
    setFollowing(updated)
    writeFollowing(currentUserId, updated)
  }

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 24, marginBottom: 20 }}>People</h1>

      {matches.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>Suggested Matches</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {matches.map((person) => (
              <div key={person.id} className="card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(99, 102, 241, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    flexShrink: 0,
                  }}>
                    👤
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: 16, marginBottom: 4 }}>{person.name}</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                      Shared: {person.similarity.sharedArtists} artist{person.similarity.sharedArtists === 1 ? '' : 's'} and {person.similarity.sharedAlbums} album{person.similarity.sharedAlbums === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="secondary"
                    onClick={() => handleConnect(person.id)}
                    style={{ flex: 1, padding: '10px', fontSize: 14 }}
                  >
                    💬 Connect
                  </button>
                  <button
                    onClick={() => toggleFollow(person.id)}
                    style={{ flex: 1, padding: '10px', fontSize: 14 }}
                  >
                    {following.includes(person.id) ? 'Following' : 'Follow'}
                  </button>
                  <Link to={`/people/${encodeURIComponent(person.id)}`} style={{ flex: 1 }}>
                    <button style={{ padding: '10px', fontSize: 14 }}>
                      View Profile
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 style={{ fontSize: 18, marginBottom: 12 }}>All Attendees</h2>
      {attendees.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-secondary)' }}>
          No attendees have uploaded records yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {attendees.map((person) => (
            <div key={person.id} className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(99, 102, 241, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  flexShrink: 0,
                }}>
                  👤
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: 16, marginBottom: 4 }}>{person.name}</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {person.stats.albums.join(', ') || 'No records yet'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="secondary"
                  onClick={() => handleConnect(person.id)}
                  style={{ flex: 1, padding: '10px', fontSize: 14 }}
                >
                  💬 Connect
                </button>
                <button
                  onClick={() => toggleFollow(person.id)}
                  style={{ flex: 1, padding: '10px', fontSize: 14 }}
                >
                  {following.includes(person.id) ? 'Following' : 'Follow'}
                </button>
                <Link to={`/people/${encodeURIComponent(person.id)}`} style={{ flex: 1 }}>
                  <button style={{ padding: '10px', fontSize: 14 }}>
                    View Profile
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
