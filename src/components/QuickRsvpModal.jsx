export default function QuickRsvpModal({
  isOpen,
  displayName,
  instagramHandle,
  onDisplayNameChange,
  onInstagramHandleChange,
  onSubmit,
  onClose,
  loading,
  error,
}) {
  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      zIndex: 50,
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: 420,
        padding: 20,
      }}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, marginBottom: 6 }}>Quick RSVP</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            Add your name so other collectors can find you at the meetup.
          </p>
        </div>

        {error && (
          <div style={{
            padding: '10px 12px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderRadius: 10,
            fontSize: 13,
            color: '#ef4444',
            marginBottom: 12,
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => onDisplayNameChange(e.target.value)}
              placeholder="e.g., QuincyCollector"
              required
              style={{
                width: '100%',
                padding: '12px 14px',
                fontSize: 15,
                borderRadius: 10,
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface)',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Instagram (optional)
            </label>
            <input
              type="text"
              value={instagramHandle}
              onChange={(e) => onInstagramHandleChange(e.target.value)}
              placeholder="@handle"
              style={{
                width: '100%',
                padding: '12px 14px',
                fontSize: 15,
                borderRadius: 10,
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface)',
                outline: 'none',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button
            className="secondary"
            onClick={onClose}
            style={{ flex: 1 }}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            style={{ flex: 1 }}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'RSVP Free'}
          </button>
        </div>
      </div>
    </div>
  )
}
