import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getVinylRecordImageUrl } from '../lib/vinylRecordUpload'

export default function MyProfile() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(null)
  const [records, setRecords] = useState([])
  const [event, setEvent] = useState(null)
  const [rsvp, setRsvp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [newDisplayName, setNewDisplayName] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        setLoading(false)
        return
      }
      setUser(currentUser)

      // Get profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single()
      setProfile(profileData)

      // Get profile photo URL if avatar_url exists in Supabase
      if (profileData?.avatar_url) {
        const { data } = await supabase.storage
          .from('records')
          .createSignedUrl(profileData.avatar_url, 3600)
        if (data?.signedUrl) {
          setProfilePhotoUrl(data.signedUrl)
        }
      } else {
        // Fallback: Check localStorage for old profile photo
        const displayName = profileData?.display_name || profileData?.email || 'Anonymous'
        const localStorageKey = `quincy_profile_photo_${displayName}`
        const localPhoto = localStorage.getItem(localStorageKey)
        if (localPhoto) {
          setProfilePhotoUrl(localPhoto)
        }
      }

      // Get active event
      const { data: activeEvent } = await supabase
        .from('events')
        .select('*')
        .eq('is_active', true)
        .single()
      setEvent(activeEvent)

      // Get RSVP status for active event
      if (activeEvent) {
        const { data: rsvpData } = await supabase
          .from('rsvps')
          .select('*')
          .eq('event_id', activeEvent.id)
          .eq('user_id', currentUser.id)
          .single()
        setRsvp(rsvpData)

        // Get user's records for this event
        const { data: recordsData } = await supabase
          .from('vinyl_records')
          .select('*')
          .eq('event_id', activeEvent.id)
          .eq('user_id', currentUser.id)

        // Get image URLs for each record
        if (recordsData) {
          const recordsWithImages = await Promise.all(
            recordsData.map(async (record) => {
              const { url } = await getVinylRecordImageUrl(record.image_path)
              return { ...record, imageUrl: url }
            })
          )
          setRecords(recordsWithImages)
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !user || !profile) return

    const reader = new FileReader()
    reader.onloadend = async () => {
      const photoData = reader.result
      const displayName = profile.display_name || profile.email || 'Anonymous'
      const localStorageKey = `quincy_profile_photo_${displayName}`

      try {
        // Save to localStorage (primary storage for now)
        localStorage.setItem(localStorageKey, photoData)
        setProfilePhotoUrl(photoData)

        // Also try to upload to Supabase Storage as backup
        try {
          const fileExt = file.name.split('.').pop()
          const fileName = `${user.id}-${Date.now()}.${fileExt}`
          const filePath = `profile-photos/${fileName}`

          const { error: uploadError } = await supabase.storage
            .from('records')
            .upload(filePath, file)

          if (!uploadError) {
            // Update profile with photo path
            await supabase
              .from('profiles')
              .update({ avatar_url: filePath })
              .eq('id', user.id)
          }
        } catch (supabaseError) {
          // Silently fail if Supabase upload doesn't work
          console.log('Supabase upload skipped:', supabaseError)
        }
      } catch (error) {
        console.error('Error uploading photo:', error)
        alert('Failed to upload photo')
      }
    }
    reader.readAsDataURL(file)
  }

  const handleUpdateDisplayName = async () => {
    if (!user || !newDisplayName.trim()) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: newDisplayName.trim() })
        .eq('id', user.id)

      if (error) throw error

      // Reload profile
      await loadProfile()
      setEditingName(false)
      setNewDisplayName('')
    } catch (error) {
      console.error('Error updating name:', error)
      alert('Failed to update name')
    }
  }

  const handleRemovePhoto = () => {
    if (!profile) return
    const displayName = profile.display_name || profile.email || 'Anonymous'
    const localStorageKey = `quincy_profile_photo_${displayName}`
    
    // Remove from localStorage
    localStorage.removeItem(localStorageKey)
    setProfilePhotoUrl(null)

    // Also try to remove from Supabase
    if (user) {
      supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id)
        .then(() => {})
        .catch(() => {})
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Please log in to view your profile</p>
      </div>
    )
  }

  const displayName = profile?.display_name || 'Anonymous'
  const instagramHandle = profile?.instagram_handle

  return (
    <div style={{ padding: 20, paddingBottom: 100 }}>
      {/* Settings button in top right */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-end',
        marginBottom: 16
      }}>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="secondary"
          style={{ 
            padding: '6px 10px',
            fontSize: 16
          }}
          aria-label="Settings"
        >
          {showSettings ? '✕' : '⚙️'}
        </button>
      </div>

      {/* Settings Section */}
      {showSettings && (
        <div className="card" style={{ padding: 16, marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, marginBottom: 16, fontWeight: 600 }}>Profile Settings</h3>

          {/* Change Display Name */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
              Display Name
            </label>
            {editingName ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  placeholder={displayName}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    fontSize: 14,
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface)',
                  }}
                />
                <button
                  onClick={handleUpdateDisplayName}
                  style={{ padding: '8px 16px', fontSize: 13 }}
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingName(false)
                    setNewDisplayName('')
                  }}
                  className="secondary"
                  style={{ padding: '8px 16px', fontSize: 13 }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: 15, margin: 0 }}>{displayName}</p>
                <button
                  onClick={() => {
                    setEditingName(true)
                    setNewDisplayName(displayName)
                  }}
                  className="secondary"
                  style={{ padding: '6px 12px', fontSize: 13 }}
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          {/* Change Profile Photo */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
              Profile Photo
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <label
                htmlFor="settings-photo-upload"
                className="secondary"
                style={{ flex: 1, padding: '8px 12px', fontSize: 13, cursor: 'pointer', textAlign: 'center' }}
              >
                {profilePhotoUrl ? 'Change Photo' : 'Upload Photo'}
              </label>
              <input
                id="settings-photo-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                style={{ display: 'none' }}
              />
              {profilePhotoUrl && (
                <button
                  onClick={handleRemovePhoto}
                  className="secondary"
                  style={{ padding: '8px 12px', fontSize: 13, color: '#ef4444' }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          {/* Account Settings */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, marginBottom: 20 }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Account</h4>
            
            {/* Phone Number */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                Phone Number
              </label>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: 14, margin: 0, color: 'var(--text-secondary)' }}>
                  {user?.phone || 'Not set'}
                </p>
                <button
                  onClick={() => alert('Phone number management coming soon! Use Supabase auth to update.')}
                  className="secondary"
                  style={{ padding: '6px 12px', fontSize: 13 }}
                >
                  Change
                </button>
              </div>
            </div>

            {/* Recovery Email */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                Recovery Email
              </label>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: 14, margin: 0, color: 'var(--text-secondary)' }}>
                  {profile?.recovery_email || 'Not set'}
                </p>
                <button
                  onClick={() => alert('Recovery email management coming soon!')}
                  className="secondary"
                  style={{ padding: '6px 12px', fontSize: 13 }}
                >
                  {profile?.recovery_email ? 'Change' : 'Add'}
                </button>
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                Password
              </label>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: 14, margin: 0, color: 'var(--text-secondary)' }}>
                  ••••••••
                </p>
                <button
                  onClick={() => alert('Password management coming soon! Use "Forgot password" on login.')}
                  className="secondary"
                  style={{ padding: '6px 12px', fontSize: 13 }}
                >
                  Change
                </button>
              </div>
            </div>
          </div>

          {/* Sign Out */}
          <button
            onClick={async () => {
              await supabase.auth.signOut()
              localStorage.clear()
              window.location.href = '/'
            }}
            style={{
              width: '100%',
              padding: '10px 16px',
              fontSize: 14,
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Sign Out
          </button>
        </div>
      )}

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
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
          overflow: 'hidden',
        }}>
          {profilePhotoUrl ? (
            <img
              src={profilePhotoUrl}
              alt={`${displayName} profile`}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            '👤'
          )}
        </div>

        {!profilePhotoUrl && (
          <>
            <label
              htmlFor="profile-photo-upload"
              className="secondary"
              style={{ padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}
            >
              Upload Photo
            </label>
            <input
              id="profile-photo-upload"
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              style={{ display: 'none' }}
            />
          </>
        )}

        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, marginBottom: 4 }}>{displayName}</h1>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>
            {records.length} record{records.length === 1 ? '' : 's'} uploaded
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>
          Username
        </p>
        <p style={{ fontSize: 16, margin: 0 }}>{displayName}</p>
        {instagramHandle && (
          <>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, marginTop: 12, textTransform: 'uppercase', fontWeight: 600 }}>
              Instagram
            </p>
            <p style={{ fontSize: 16, margin: 0 }}>@{instagramHandle}</p>
          </>
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>Your Records</h2>
        {records.length === 0 ? (
          <div className="card" style={{ padding: 16, textAlign: 'center', color: 'var(--text-secondary)' }}>
            No records uploaded yet.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {records.map((record) => (
              <div key={record.id} className="card" style={{ padding: 12 }}>
                <div style={{
                  width: '100%',
                  aspectRatio: '1',
                  backgroundColor: 'rgba(99, 102, 241, 0.1)',
                  borderRadius: 8,
                  marginBottom: 8,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {record.imageUrl ? (
                    <img
                      src={record.imageUrl}
                      alt={record.typed_album}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ fontSize: 32 }}>🎵</span>
                  )}
                </div>
                <h3 style={{ fontSize: 14, margin: '0 0 4px 0', fontWeight: 600 }}>
                  {record.typed_album}
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
                  {record.typed_artist}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
