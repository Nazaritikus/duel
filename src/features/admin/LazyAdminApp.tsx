import { lazy, Suspense } from 'react'

// The admin (and supabase-js) stay out of the game's initial bundle.
const AdminApp = lazy(() => import('./AdminApp'))

export function LazyAdminApp() {
  return (
    <Suspense fallback={null}>
      <AdminApp />
    </Suspense>
  )
}
