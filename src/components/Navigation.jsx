import { Link, useLocation } from 'react-router-dom'

export default function Navigation() {
  const location = useLocation()

  // Don't show navigation on login/signup pages
  if (location.pathname === '/login' || location.pathname === '/signup') {
    return null
  }

  const linkStyle = {
    color: 'inherit',
    textDecoration: 'none',
    padding: '8px 12px',
    borderRadius: 4,
  }

  const activeLinkStyle = {
    ...linkStyle,
    backgroundColor: 'rgba(100, 108, 255, 0.1)',
    color: '#646cff',
  }

  const isActive = (path) => location.pathname === path

  return (
    <nav style={{
      padding: '16px 24px',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      display: 'flex',
      gap: 16,
      justifyContent: 'center',
      flexWrap: 'wrap',
    }}>
      <Link to="/" style={isActive('/') ? activeLinkStyle : linkStyle}>
        Home
      </Link>
      <Link to="/records" style={isActive('/records') ? activeLinkStyle : linkStyle}>
        Records
      </Link>
      <Link to="/event" style={isActive('/event') ? activeLinkStyle : linkStyle}>
        Event
      </Link>
      <Link to="/people" style={isActive('/people') ? activeLinkStyle : linkStyle}>
        People
      </Link>
      <Link to="/me" style={isActive('/me') ? activeLinkStyle : linkStyle}>
        Me
      </Link>
    </nav>
  )
}
