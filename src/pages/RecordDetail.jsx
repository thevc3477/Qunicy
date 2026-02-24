import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getVinylRecordImageUrl } from '../lib/vinylRecordUpload'
import { useAuth } from '../context/AuthContext'
import { fetchSupabase } from '../lib/fetchSupabase'

const formatHandle = (value) => {
  const trimmed = (value || '').trim()
  if (!trimmed) return 'A collector'
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`
}

export default function RecordDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [record, setRecord] = useState(null)
  const [imageUrl, setImageUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Vibe state
  const [vibeStatus, setVibeStatus] = useState(null) // null | 'pending' | 'accepted' | 'declined'
  const [vibeSending, setVibeSending] = useState(false)

  useEffect(() => {
    const loadRecord = async () => {
      if (!id) { setLoading(false); return }

      const { data, error: recordError } = await supabase
        .from('vinyl_records')
        .select('id, typed_album, typed_artist, image_path, user_id, event_id, profiles(display_name)')
        .eq('id', id)
        .maybeSingle()

      if (recordError) {
        console.error('Failed to load record:', recordError)
        setError('Could not load this record.')
        setLoading(false)
        return
      }

      if (!data) { setLoading(false); return }

      setRecord({
        id: data.id,
        album: data.typed_album || '',
        artist: data.typed_artist || '',
        displayName: data.profiles?.display_name || '',
        imagePath: data.image_path || '',
        userId: data.user_id,
        eventId: data.event_id,
      })

      if (data.image_path) {
        const { url } = await getVinylRecordImageUrl(data.image_path)
        setImageUrl(url)
      }

      // Check existing vibe
      if (user && data.user_id !== user.id && data.event_id) {
        const { data: vibes } = await fetchSupabase(
          `/rest/v1/vibes?sender_id=eq.${user.id}&receiver_id=eq.${data.user_id}&event_id=eq.${data.event_id}&select=status`
        )
        if (vibes?.length > 0) {
          setVibeStatus(vibes[0].status)
        }
      }

      setLoading(false)
    }

    loadRecord()
  }, [id, user])

  const sendVibe = async () => {
    if (!user || !record || vibeSending) return
    setVibeSending(true)

    const { data, error: vibeErr } = await fetchSupabase('/rest/v1/vibes', {
      method: 'POST',
      headers: { 'Prefer': 'return=representation,resolution=merge-duplicates' },
      body: {
        sender_id: user.id,
        receiver_id: record.userId,
        record_id: record.id,
        event_id: record.eventId,
      },
    })

    if (!vibeErr && data?.length > 0) {
      setVibeStatus(data[0].status)
    } else if (!vibeErr) {
      setVibeStatus('pending')
    }
    setVibeSending(false)
  }

  const isOwnRecord = user && record && record.userId === user.id
  const showVibeButton = user && record && !isOwnRecord

  const vibeButtonLabel = vibeStatus === 'accepted' ? 'Vibing 🎶'
    : vibeStatus === 'pending' ? 'Vibe Sent! ✨'
    : vibeStatus === 'declined' ? 'Vibe Sent! ✨'
    : 'Send a Vibe 🎵'

  const vibeButtonDisabled = vibeSending || vibeStatus === 'pending' || vibeStatus === 'accepted' || vibeStatus === 'declined'

  return (
    <div style={{ padding: 20 }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
      }}>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading record...</p>
        ) : record ? (
          <>
            <div style={{
              width: '100%',
              maxWidth: 320,
              aspectRatio: '1',
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 80,
              overflow: 'hidden',
            }}>
              {imageUrl ? (
                <img src={imageUrl} alt={record.album || 'Record cover'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span>🎵</span>
              )}
            </div>

            <div style={{ textAlign: 'center', width: '100%' }}>
              <h1 style={{ fontSize: 24, marginBottom: 8 }}>
                {record.album || 'Album info unavailable'}
              </h1>
              <p style={{ fontSize: 18, color: 'var(--text-secondary)', marginBottom: 24 }}>
                {record.artist || 'Artist info unavailable'}
              </p>

              <div className="card">
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Uploaded by
                </p>
                <p style={{ fontSize: 16, fontWeight: 600 }}>{formatHandle(record.displayName)}</p>
              </div>
            </div>

            {/* Send a Vibe button */}
            {showVibeButton && (
              <button
                onClick={sendVibe}
                disabled={vibeButtonDisabled}
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  fontSize: 16,
                  fontWeight: 600,
                  borderRadius: 12,
                  border: 'none',
                  backgroundColor: vibeStatus === 'accepted' ? '#10b981'
                    : vibeStatus === 'pending' || vibeStatus === 'declined' ? '#6b7280'
                    : '#8b5cf6',
                  color: 'white',
                  cursor: vibeButtonDisabled ? 'default' : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {vibeSending ? 'Sending...' : vibeButtonLabel}
              </button>
            )}
          </>
        ) : (
          <div className="card" style={{ padding: 16 }}>
            <p style={{ fontSize: 15, marginBottom: 8 }}>Record not found</p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              This record may have been removed or is not available yet.
            </p>
          </div>
        )}

        {error && (
          <div style={{
            padding: '10px 12px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderRadius: 12,
            fontSize: 13,
            color: '#ef4444',
          }}>
            {error}
          </div>
        )}

        <Link to="/records" style={{ width: '100%' }}>
          <button className="secondary">
            ← Back to Records
          </button>
        </Link>
      </div>
    </div>
  )
}
