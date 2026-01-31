import { Link, useLocation } from 'react-router-dom'

export default function BottomNav() {
  const location = useLocation()

  // Check if user is logged in
  const isLoggedIn = localStorage.getItem('quincy_logged_in') === 'true'

  // Don't show bottom nav if user is not logged in OR on login/signup pages
  if (!isLoggedIn || location.pathname === '/login' || location.pathname === '/signup') {
    return null
  }

  const tabs = [
    // Dynamic first tab: Login when not logged in, Home when logged in
    isLoggedIn 
      ? { key: 'home', path: '/home', label: 'Home', icon: '🏠' }
      : { key: 'login', path: '/login', label: 'Login', icon: '🔑' },
    { key: 'records', path: '/records', label: 'Records', icon: '💿' },
    { key: 'event', path: '/event', label: 'Event', icon: '📅' },
    { key: 'people', path: '/people', label: 'People', icon: '👥' },
    { key: 'me', path: '/me', label: 'Me', icon: '👤' },
  ]

  const isActive = (path) => {
    // Handle /home path (also matches root path)
    if (path === '/home') {
      return location.pathname === '/home' || location.pathname === '/'
    }
    // Handle /event path
    if (path === '/event') {
      return location.pathname === '/event'
    }
    return location.pathname.startsWith(path)
  }

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
            color: isActive(tab.path) ? 'var(--primary-color)' : 'var(--text-secondary)',
            transition: 'color 0.2s',
          }}
        >
          <span style={{ fontSize: 20 }}>{tab.icon}</span>
          <span style={{
            fontSize: 11,
            fontWeight: isActive(tab.path) ? 600 : 400,
          }}>
            {tab.label}
          </span>
        </Link>
      ))}
    </nav>
  )
}
