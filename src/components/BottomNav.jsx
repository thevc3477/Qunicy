import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState, useEffect } from 'react'
import { fetchSupabase } from '../lib/fetchSupabase'

export default function BottomNav() {
  const location = useLocation()
  const { user } = useAuth()
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (!user) return
    const checkPending = async () => {
      const { data } = await fetchSupabase(
        `/rest/v1/vibes?receiver_id=eq.${user.id}&status=eq.pending&select=id`
      )
      setPendingCount(data?.length || 0)
    }
    checkPending()
    const interval = setInterval(checkPending, 30000)
    return () => clearInterval(interval)
  }, [user])

  if (!user) return null

  const tabs = [
    { key: 'event', path: '/event', label: 'Event', icon: '📅' },
    { key: 'records', path: '/records', label: 'Vinyl Wall', icon: '💿' },
    { key: 'matches', path: '/matches', label: 'Connections', icon: '💬', badge: pendingCount },
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
            position: 'relative',
          }}
        >
          <span style={{ fontSize: 20, position: 'relative' }}>
            {tab.icon}
            {tab.badge > 0 && (
              <span style={{
                position: 'absolute',
                top: -4,
                right: -8,
                minWidth: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: '#ef4444',
                color: 'white',
                fontSize: 10,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 4px',
              }}>{tab.badge}</span>
            )}
          </span>
          <span style={{ fontSize: 11, fontWeight: isActive(tab.path) ? 600 : 400 }}>
            {tab.label}
          </span>
        </Link>
      ))}
    </nav>
  )
}
