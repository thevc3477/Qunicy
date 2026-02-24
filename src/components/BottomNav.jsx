import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function BottomNav() {
  const location = useLocation()
  const { user } = useAuth()

  if (!user) return null

  const tabs = [
    { key: 'event', path: '/event', label: 'Event', icon: '📅' },
    { key: 'records', path: '/records', label: 'Vinyl Wall', icon: '💿' },
    { key: 'matches', path: '/matches', label: 'Connections', icon: '💬' },
    { key: 'me', path: '/me', label: 'Me', icon: '👤' },
  ]

  const isActive = (path) => location.pathname.startsWith(path)

  return (
    <nav style={{
      height: 70,
      borderTop: '1px solid var(--border)',
      backgroundColor: 'var(--surface)',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      position: 'sticky',
      bottom: 0,
      zIndex: 10,
    }}>
      {tabs.map(tab => (
        <Link
          key={tab.key}
          to={tab.path}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            padding: '8px 0',
            textDecoration: 'none',
            color: isActive(tab.path) ? '#FFFFFF' : 'var(--text-secondary)',
            transition: 'color 0.2s',
          }}
        >
          <span style={{ fontSize: 20 }}>{tab.icon}</span>
          <span style={{ fontSize: 11, fontWeight: isActive(tab.path) ? 600 : 400 }}>
            {tab.label}
          </span>
        </Link>
      ))}
    </nav>
  )
}
