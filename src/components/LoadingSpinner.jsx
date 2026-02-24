export default function LoadingSpinner({ text = "Flipping through the crates..." }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, minHeight: 200 }}>
      <div className="vinyl-spinner" style={{ width: 80, height: 80, borderRadius: '50%', background: 'radial-gradient(circle at center, #444 18%, #222 19%, #222 24%, #333 25%, #1a1a1a 26%, #1a1a1a 48%, #333 49%, #1a1a1a 50%, #1a1a1a 70%, #333 71%, #1a1a1a 72%, #1a1a1a 100%)', boxShadow: '0 0 20px rgba(99,102,241,0.3)', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 16, height: 16, borderRadius: '50%', background: 'var(--primary-color, #6366f1)', border: '2px solid #555' }} />
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 16, fontStyle: 'italic' }}>{text}</p>
      <style>{`
        @keyframes vinyl-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .vinyl-spinner { animation: vinyl-spin 2s linear infinite; }
      `}</style>
    </div>
  )
}
