import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { AdminShell } from './AdminShell'
import { useAdminApi } from './adminApi'
import { useAdminSession } from './sessionContext'

/** Gate for every admin page except login: session required, allowlisted users only. */
export function RequireAdmin() {
  const session = useAdminSession()
  const api = useAdminApi()
  const location = useLocation()

  if (session.status === 'loading') {
    return <p className="admin-center admin-muted">Завантаження…</p>
  }
  if (session.status === 'signed-out') {
    // Keep the query: an expired magic link comes back with `?error_description=…`.
    return <Navigate to={`/admin/login${location.search}`} replace />
  }
  if (!session.isAdmin) {
    return (
      <main className="admin-center">
        <h1 className="admin-title">Немає доступу</h1>
        <p className="admin-muted">
          {session.checkFailed
            ? 'Не вдалося перевірити доступ. Оновіть сторінку.'
            : `Обліковий запис ${session.user.email} не має доступу до адмінки.`}
        </p>
        <button type="button" className="admin-btn" onClick={() => void api.signOut()}>
          Вийти
        </button>
      </main>
    )
  }
  return (
    <AdminShell email={session.user.email}>
      <Outlet />
    </AdminShell>
  )
}
