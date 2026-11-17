import { useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { getSupabase } from '../../lib/supabase'
import './admin.css'
import { AdminApiContext, createSupabaseAdminApi, type AdminApi } from './adminApi'
import { CategoriesPage } from './CategoriesPage'
import { CategoryEditorPage } from './CategoryEditorPage'
import { LoginPage } from './LoginPage'
import { RequireAdmin } from './RequireAdmin'
import { AdminSessionProvider } from './session'

/** Admin routes, rendered under `/admin/*`. */
export function AdminRoutes({ api }: { api: AdminApi }) {
  return (
    <AdminApiContext.Provider value={api}>
      <AdminSessionProvider>
        <Routes>
          <Route path="login" element={<LoginPage />} />
          <Route element={<RequireAdmin />}>
            <Route index element={<CategoriesPage />} />
            <Route path="categories/new" element={<CategoryEditorPage key="new" />} />
            <Route path="categories/:id" element={<CategoryEditorPage />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>
        </Routes>
      </AdminSessionProvider>
    </AdminApiContext.Provider>
  )
}

function createApi(): AdminApi | null {
  try {
    return createSupabaseAdminApi(getSupabase())
  } catch {
    return null
  }
}

/** Lazy-loaded entry for `/admin/*`: builds the Supabase-backed API once. */
export default function AdminApp() {
  const [api] = useState(createApi)
  if (!api) {
    return (
      <main className="admin-center">
        <h1 className="admin-title">Supabase не налаштовано</h1>
        <p className="admin-muted">
          Задайте VITE_SUPABASE_URL і VITE_SUPABASE_PUBLISHABLE_KEY (див. docs/setup.md).
        </p>
      </main>
    )
  }
  return <AdminRoutes api={api} />
}
