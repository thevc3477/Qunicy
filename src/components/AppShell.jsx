import { useLocation } from 'react-router-dom'
import Header from './Header'
import BottomNav from './BottomNav'

export default function AppShell({ children }) {
  const location = useLocation()
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup'

  return (
    <>
      {!isAuthPage && <Header />}
      <main style={{
        flex: 1,
        overflowY: 'auto',
        backgroundColor: isAuthPage ? 'var(--surface)' : 'var(--background)',
      }}>
        {children}
      </main>
      <BottomNav />
    </>
  )
}
