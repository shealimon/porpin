import { NavLink, Outlet } from 'react-router-dom'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `nav-link${isActive ? ' nav-link--active' : ''}`

export function Layout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <NavLink to="/" className="app-brand">
          Porpin
        </NavLink>
        <nav className="app-nav" aria-label="Main">
          <NavLink to="/" className={linkClass} end>
            Upload
          </NavLink>
          <NavLink to="/history" className={linkClass}>
            History
          </NavLink>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
