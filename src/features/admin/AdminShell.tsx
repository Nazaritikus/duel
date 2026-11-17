import type { ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAdminApi } from './adminApi'

/** Sidebar layout from the AdminCategories artboard. */
export function AdminShell({ email, children }: { email: string; children: ReactNode }) {
  const api = useAdminApi()
  return (
    <div className="admin">
      <nav className="admin-nav" aria-label="Адмінка">
        <div className="admin-nav__logo">
          DUEL <span>admin</span>
        </div>
        <NavLink to="/admin" end={false} className="admin-nav__item admin-nav__item--active">
          Категорії
        </NavLink>
        <div className="admin-nav__bottom">
          <Link to="/" className="admin-nav__item admin-nav__game">
            Відкрити гру →
          </Link>
          <div className="admin-nav__user" title={email}>
            {email}
          </div>
          <button
            type="button"
            className="admin-nav__item admin-nav__logout"
            onClick={() => void api.signOut()}
          >
            Вийти
          </button>
        </div>
      </nav>
      <main className="admin-main">{children}</main>
    </div>
  )
}
