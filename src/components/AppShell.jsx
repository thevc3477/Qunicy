import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Header from './Header'
import BottomNav from './BottomNav'

export default function AppShell({ children }) {
  const location = useLocation()
  const { user } = useAuth()
  const hideChrome = ['/auth', '/onboarding'].includes(location.pathname)
  const showNav = user && !hideChrome

  return (
    <>
      {!hideChrome && <Header />}
      <main style={{
        flex: 1,
        overflowY: 'auto',
        backgroundColor: hideChrome ? 'var(--surface)' : 'var(--background)',
      }}>
        {children}
      </main>
      {showNav && <BottomNav />}
    </>
  )
}
