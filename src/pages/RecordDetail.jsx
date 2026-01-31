import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getVinylRecordImageUrl } from '../lib/vinylRecordUpload'

const formatHandle = (value) => {
  const trimmed = (value || '').trim()
  if (!trimmed) return 'A collector'
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`
}

export default function RecordDetail() {
  const { id } = useParams()
  const [record, setRecord] = useState(null)
  const [imageUrl, setImageUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadRecord = async () => {
      if (!id) {
        setLoading(false)
        return
      }

      const { data, error: recordError } = await supabase
        .from('vinyl_records')
        .select('id, typed_album, typed_artist, image_path, user_id, profiles(display_name)')
        .eq('id', id)
        .maybeSingle()

      if (recordError) {
        console.error('Failed to load record:', recordError)
        setError('Could not load this record.')
        setLoading(false)
        return
      }

      if (!data) {
        setLoading(false)
        return
      }

      setRecord({
        id: data.id,
        album: data.typed_album || '',
        artist: data.typed_artist || '',
        displayName: data.profiles?.display_name || '',
        imagePath: data.image_path || '',
      })

      if (data.image_path) {
        const { url } = await getVinylRecordImageUrl(data.image_path)
        setImageUrl(url)
      }

      setLoading(false)
    }

    loadRecord()
  }, [id])

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
