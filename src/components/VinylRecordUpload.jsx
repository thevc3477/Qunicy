import { useState } from 'react'
import { uploadVinylRecord, getVinylRecordImageUrl } from '../lib/vinylRecordUpload'

export default function VinylRecordUpload({ eventId, userId, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [uploadedRecord, setUploadedRecord] = useState(null)
  const [imageUrl, setImageUrl] = useState(null)
  const [error, setError] = useState(null)

  // Form state
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [typedArtist, setTypedArtist] = useState('')
  const [typedAlbum, setTypedAlbum] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [extractionError, setExtractionError] = useState(null)
  const [extractionComplete, setExtractionComplete] = useState(false)

  // Compress image for AI processing
  const compressImage = (file, maxWidth = 800, quality = 0.7) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.onload = () => {
        let width = img.width
        let height = img.height
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        
        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      
      img.src = URL.createObjectURL(file)
    })
  }

  // Extract vinyl info using AI
  const extractVinylInfo = async (imageData) => {
    setExtracting(true)
    setExtractionError(null)
    setExtractionComplete(false)
    
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ailkqrjqiuemdkdtgewc.supabase.co'
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpbGtxcmpxaXVlbWRrZHRnZXdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2NjM4NjMsImV4cCI6MjA4MzIzOTg2M30.OtMZf_33oo1Vj1OCEgnua7n-w4Q-4ko-qErSh19DT5Q'

      const response = await fetch(`${supabaseUrl}/functions/v1/extract-vinyl-info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({ image: imageData })
      })

      const data = await response.json()

      if (!response.ok || data?.error) {
        throw new Error(data?.error || 'Could not extract info')
      }

      if (data?.album && data?.artist) {
        setTypedArtist(data.artist)
        setTypedAlbum(data.album)
      } else {
        setExtractionError("Couldn't read that—please type it in.")
      }
    } catch (err) {
      console.error('Extraction error:', err)
      setExtractionError("Couldn't read that—please type it in.")
    } finally {
      setExtracting(false)
      setExtractionComplete(true)
    }
  }

  // Handle file selection
  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
      // Reset form state
      setTypedArtist('')
      setTypedAlbum('')
      setExtractionError(null)
      setExtractionComplete(false)

      // Create preview URL
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result)
      }
      reader.readAsDataURL(file)

      // Extract info with AI
      const compressed = await compressImage(file, 800, 0.7)
      await extractVinylInfo(compressed)
    }
  }

  // Handle upload
  const handleUpload = async () => {
    setError(null)

    if (!userId) {
      setError('You must be logged in to upload')
      return
    }

    if (!selectedFile) {
      setError('Please select an image')
      return
    }

    if (!typedArtist || !typedAlbum) {
      setError('Please enter artist and album name')
      return
    }

    setLoading(true)

    const result = await uploadVinylRecord({
      imageFile: selectedFile,
      eventId: eventId,
      userId: userId,
      typedArtist: typedArtist.trim(),
      typedAlbum: typedAlbum.trim()
    })

    if (result.success) {
      setUploadedRecord(result.record)

      // Get signed URL for the uploaded image
      const { url } = await getVinylRecordImageUrl(result.record.image_path)
      setImageUrl(url)

      // Set localStorage flag for uploaded record
      localStorage.setItem('quincy_uploaded_record', 'true')

      // Call parent callback to refresh data
      if (onSuccess) {
        onSuccess()
      }

      // Reset form
      setSelectedFile(null)
      setPreviewUrl(null)
      setTypedArtist('')
      setTypedAlbum('')
    } else {
      setError(result.error)
    }

    setLoading(false)
  }

  if (!userId) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>
          Please log in to upload vinyl records
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: 20 }}>
      {/* Error display */}
      {error && (
        <div style={{
          padding: 12,
          marginBottom: 16,
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 8,
          color: '#ef4444',
          fontSize: 14
        }}>
          {error}
        </div>
      )}

      {/* Upload form */}
      <div style={{ marginBottom: 24 }}>
        {/* Hidden file input */}
        <input
          id="vinyl-file-input"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        {!previewUrl ? (
          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="vinyl-file-input"
              style={{
                display: 'block',
                width: '100%',
                padding: '60px 20px',
                border: '2px dashed var(--border)',
                borderRadius: 16,
                backgroundColor: 'var(--surface)',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s',
              }}
              onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary-color)'}
              onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ fontSize: 48, marginBottom: 12 }}>📸</div>
              <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                Take Photo or Choose Image
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                AI will read the album info for you
              </p>
            </label>
          </div>
        ) : (
          <div style={{ marginBottom: 16 }}>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <img
                src={previewUrl}
                alt="Preview"
                style={{
                  width: '100%',
                  maxHeight: 300,
                  borderRadius: 12,
                  objectFit: 'cover'
                }}
              />
              <button
                type="button"
                onClick={() => {
                  setPreviewUrl(null)
                  setSelectedFile(null)
                  setTypedArtist('')
                  setTypedAlbum('')
                  setExtractionError(null)
                  setExtractionComplete(false)
                }}
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  background: 'rgba(0,0,0,0.6)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 36,
                  height: 36,
                  color: 'white',
                  fontSize: 20,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  minHeight: 'auto'
                }}
              >
                ×
              </button>
            </div>
          </div>
        )}

        {extracting && (
          <div style={{ textAlign: 'center', padding: 32, marginBottom: 16 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
              Reading record details…
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              This takes a few seconds
            </p>
          </div>
        )}

        {previewUrl && extractionComplete && (
          <>
            {extractionError && (
              <div style={{
                padding: '10px 12px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderRadius: 8,
                fontSize: 13,
                color: '#ef4444',
                marginBottom: 16,
              }}>
                {extractionError}
              </div>
            )}

            {typedArtist && typedAlbum && !extractionError && (
              <div style={{
                padding: '10px 12px',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderRadius: 8,
                fontSize: 13,
                color: '#059669',
                marginBottom: 16,
              }}>
                ✨ Detected from photo — edit if needed
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
                Artist Name
              </label>
              <input
                type="text"
                value={typedArtist}
                onChange={(e) => setTypedArtist(e.target.value)}
                placeholder="e.g., Michael Jackson"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: 15,
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface)',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>
                Album Name
              </label>
              <input
                type="text"
                value={typedAlbum}
                onChange={(e) => setTypedAlbum(e.target.value)}
                placeholder="e.g., Bad"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: 15,
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface)',
                  outline: 'none',
                }}
              />
            </div>
          </>
        )}

      </div>

      {/* Always visible Upload Record button */}
      <button
        onClick={() => {
          if (!previewUrl) {
            // If no photo selected, trigger file picker
            document.getElementById('vinyl-file-input').click()
          } else {
            // If photo selected, proceed with upload
            handleUpload()
          }
        }}
        disabled={loading || extracting}
        style={{
          width: '100%',
          padding: '16px 20px',
          fontSize: 16,
          fontWeight: 600,
          borderRadius: 12,
          border: 'none',
          backgroundColor: (loading || extracting) ? '#9ca3af' : '#8b5cf6',
          color: 'white',
          cursor: (loading || extracting) ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s'
        }}
      >
        {loading ? 'Uploading...' : !previewUrl ? 'Choose Image' : 'Upload Record'}
      </button>

      {/* Display uploaded record */}
      {uploadedRecord && imageUrl && (
        <div style={{
          padding: 16,
          backgroundColor: 'var(--surface)',
          borderRadius: 8,
          border: '1px solid var(--border)'
        }}>
          <h3 style={{ fontSize: 18, marginBottom: 12 }}>Upload Successful!</h3>

          <div style={{ marginBottom: 12 }}>
            <img
              src={imageUrl}
              alt={`${uploadedRecord.typed_album} by ${uploadedRecord.typed_artist}`}
              style={{
                width: '100%',
                maxHeight: 300,
                borderRadius: 8,
                objectFit: 'cover'
              }}
            />
          </div>

          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
            {uploadedRecord.typed_album}
          </p>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            {uploadedRecord.typed_artist}
          </p>
        </div>
      )}
    </div>
  )
}
