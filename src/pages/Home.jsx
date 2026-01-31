import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [username, setUsername] = useState('')

  useEffect(() => {
    const loggedIn = localStorage.getItem('quincy_logged_in') === 'true'
    
    if (loggedIn) {
      const user = localStorage.getItem('quincy_user')
      if (user) {
        // Valid login with user data
        const userData = JSON.parse(user)
        setUsername(userData.username)
        setIsLoggedIn(true)
      } else {
        // Invalid state: logged in flag set but no user data
        // Clear the invalid login flag
        localStorage.removeItem('quincy_logged_in')
        setIsLoggedIn(false)
      }
    } else {
      setIsLoggedIn(false)
    }
  }, [])

  if (isLoggedIn) {
    return (
      <div style={{ padding: 20 }}>
        <div style={{ textAlign: 'center', marginBottom: 32, marginTop: 20 }}>
          <h1 style={{ fontSize: 32, marginBottom: 8, color: 'var(--primary-color)' }}>
            Welcome back, {username}!
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>
            Check out the upcoming Vinyl Collectiv meetups
          </p>
        </div>

        <div className="card">
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Quick Links</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Link to="/event">
              <button>View Events</button>
            </Link>
            <Link to="/records">
              <button className="secondary">Browse records people are bringing</button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ textAlign: 'center', marginBottom: 32, marginTop: 20 }}>
        <h1 style={{ fontSize: 32, marginBottom: 8, color: 'var(--primary-color)' }}>
          Welcome to Quincy
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)' }}>
          Vinyl Collectiv upcoming events + music community
        </p>
      </div>

      <div className="card">
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>Get Started</h2>
        <Link to="/auth">
          <button style={{ width: '100%' }}>Sign In / Sign Up</button>
        </Link>
      </div>
    </div>
  );
}
