export default function Header() {
  return (
    <header style={{
      height: 60,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderBottom: '1px solid var(--border)',
      backgroundColor: 'var(--surface)',
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      <h1 style={{
        fontSize: 20,
        fontWeight: 700,
        color: 'var(--primary-color)',
      }}>
        Quincy
      </h1>
    </header>
  )
}
