import { useEffect, useState, type ReactNode } from 'react'
import { useAdminApi, type AdminUser } from './adminApi'
import { SessionContext, type AdminSession } from './sessionContext'

interface AdminCheck {
  userId: string
  isAdmin: boolean
  failed: boolean
}

/** Tracks the signed-in user and whether they are on the admin allowlist. */
export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const api = useAdminApi()
  const [user, setUser] = useState<AdminUser | null | undefined>(undefined)
  const [check, setCheck] = useState<AdminCheck | null>(null)

  useEffect(() => api.onAuthChange(setUser), [api])

  const userId = user?.id
  useEffect(() => {
    if (!userId) return
    let cancelled = false
    // Deferred out of the auth callback: supabase-js must not be re-entered from inside it.
    api.isAdmin(userId).then(
      (isAdmin) => !cancelled && setCheck({ userId, isAdmin, failed: false }),
      () => !cancelled && setCheck({ userId, isAdmin: false, failed: true }),
    )
    return () => {
      cancelled = true
    }
  }, [api, userId])

  let session: AdminSession
  if (user === undefined) session = { status: 'loading' }
  else if (user === null) session = { status: 'signed-out' }
  else if (check?.userId !== user.id) session = { status: 'loading' }
  else session = { status: 'signed-in', user, isAdmin: check.isAdmin, checkFailed: check.failed }

  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
}
