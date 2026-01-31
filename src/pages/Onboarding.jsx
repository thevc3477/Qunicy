import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const genres = [
  'Jazz',
  'Rock',
  'Pop',
  'R&B',
  'Soul',
  'Hip Hop',
  'Electronic',
  'Folk',
  'Blues',
  'Classical',
  'Funk',
  'Indie',
]

export default function Onboarding() {
  const navigate = useNavigate()
  const [selectedAlbums, setSelectedAlbums] = useState([])
  const [selectedGenres, setSelectedGenres] = useState([])
  const [currentInput, setCurrentInput] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const searchTimeoutRef = useRef(null)

  // Search albums using Supabase Edge Function
  const searchAlbums = async (query) => {
    if (!query || query.length < 2) {
      setSuggestions([])
      return
    }

    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      // Get the Supabase URL and anon key
      const supabaseUrl = supabase.supabaseUrl || import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = supabase.supabaseKey || import.meta.env.VITE_SUPABASE_ANON_KEY

      const response = await fetch(
        `${supabaseUrl}/functions/v1/spotify-search?q=${encodeURIComponent(query)}`,
        {
          headers: {
            'Authorization': `Bearer ${session?.access_token || supabaseAnonKey}`,
            'Content-Type': 'application/json',
          }
        }
      )

      if (response.ok) {
        const albums = await response.json()
        // Transform to match our UI format
        const formattedAlbums = albums.map((album) => ({
          id: album.id,
          name: album.name,
          artist: album.artist,
          displayName: `${album.name} - ${album.artist}`,
          imageUrl: album.imageUrl
        }))
        setSuggestions(formattedAlbums)
      } else {
        console.error('Album search failed:', await response.text())
        setSuggestions([])
      }
    } catch (error) {
      console.error('Error searching albums:', error)
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (value) => {
    setCurrentInput(value)

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (value.length >= 2) {
      // Debounce search by 300ms
      searchTimeoutRef.current = setTimeout(() => {
        searchAlbums(value)
      }, 300)
    } else {
      setSuggestions([])
    }
  }

  const addAlbum = (albumDisplayName) => {
    if (selectedAlbums.length < 3 && !selectedAlbums.includes(albumDisplayName)) {
      setSelectedAlbums([...selectedAlbums, albumDisplayName])
      setCurrentInput('')
      setSuggestions([])
    }
  }

  const removeAlbum = (index) => {
    setSelectedAlbums(selectedAlbums.filter((_, i) => i !== index))
  }

  const toggleGenre = (genre) => {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter(g => g !== genre))
    } else if (selectedGenres.length < 3) {
      setSelectedGenres([...selectedGenres, genre])
    }
  }

  const handleComplete = async () => {
    try {
      // Get the authenticated session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session?.user) {
        alert('You must be logged in to complete onboarding')
        return
      }

      // Upsert the profile with top albums and genres
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: session.user.id,
          top_albums: selectedAlbums,
          top_genres: selectedGenres,
        })

      if (upsertError) {
        console.error('Error saving profile:', upsertError)
        alert('Error saving profile. Please try again.')
        return
      }

      // Navigate to home on success
      navigate('/')
    } catch (err) {
      console.error('Unexpected error:', err)
      alert('An unexpected error occurred')
    }
  }

  return (
    <div style={{ padding: 20, paddingBottom: 100 }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, marginBottom: 8, color: 'var(--primary-color)' }}>
          Complete Your Profile
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>
          Help us find your perfect vinyl connections
        </p>
      </div>

      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, marginBottom: 12 }}>
          Enter Your Top 3 Albums
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
          {selectedAlbums.length}/3 added
        </p>

        {/* Selected Albums */}
        {selectedAlbums.map((album, index) => (
          <div
            key={index}
            style={{
              padding: '12px 16px',
              marginBottom: 8,
              backgroundColor: 'var(--primary-color)',
              color: 'white',
              borderRadius: 12,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600 }}>{album}</span>
            <button
              onClick={() => removeAlbum(index)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: 18,
                cursor: 'pointer',
                padding: 0,
                width: 'auto',
                minHeight: 'auto',
              }}
            >
              ×
            </button>
          </div>
        ))}

        {/* Input for new album */}
        {selectedAlbums.length < 3 && (
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <input
              type="text"
              value={currentInput}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Type album name (e.g., Kind of Blue - Miles Davis)"
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: 15,
                borderRadius: 12,
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface)',
                outline: 'none',
              }}
            />

            {/* Suggestions dropdown */}
            {(suggestions.length > 0 || loading) && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                marginTop: 4,
                maxHeight: 200,
                overflowY: 'auto',
                zIndex: 10,
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              }}>
                {loading ? (
                  <div style={{
                    padding: '12px 16px',
                    fontSize: 14,
                    color: 'var(--text-secondary)',
                    textAlign: 'center'
                  }}>
                    Searching...
                  </div>
                ) : (
                  suggestions.map((album, index) => (
                    <div
                      key={index}
                      onClick={() => addAlbum(album.displayName)}
                      style={{
                        padding: '12px 16px',
                        fontSize: 14,
                        cursor: 'pointer',
                        borderBottom: index < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--background)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {album.displayName}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {currentInput && suggestions.length === 0 && currentInput.length > 2 && !loading && (
          <button
            onClick={() => addAlbum(currentInput)}
            className="secondary"
            style={{ marginBottom: 16 }}
          >
            Add "{currentInput}"
          </button>
        )}
      </div>

      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, marginBottom: 12 }}>
          Select Your Top 3 Genres
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
          {selectedGenres.length}/3 selected
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {genres.map(genre => (
            <div
              key={genre}
              onClick={() => toggleGenre(genre)}
              style={{
                padding: '12px 8px',
                backgroundColor: selectedGenres.includes(genre)
                  ? 'var(--primary-color)'
                  : 'var(--surface)',
                color: selectedGenres.includes(genre)
                  ? 'white'
                  : 'var(--text-primary)',
                border: `1px solid ${selectedGenres.includes(genre)
                  ? 'var(--primary-color)'
                  : 'var(--border)'}`,
                borderRadius: 12,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: selectedGenres.includes(genre) ? 600 : 400,
                textAlign: 'center',
                transition: 'all 0.2s',
              }}
            >
              {genre}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleComplete}
        disabled={selectedAlbums.length < 3 || selectedGenres.length < 3}
        style={{ opacity: (selectedAlbums.length < 3 || selectedGenres.length < 3) ? 0.5 : 1 }}
      >
        Complete Setup
      </button>

      {(selectedAlbums.length < 3 || selectedGenres.length < 3) && (
        <p style={{
          textAlign: 'center',
          marginTop: 16,
          fontSize: 13,
          color: 'var(--text-secondary)'
        }}>
          Please add 3 albums and select 3 genres to continue
        </p>
      )}
    </div>
  )
}
