import { createContext, useContext } from 'react'
import type { AdminUser } from './adminApi'

export type AdminSession =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; user: AdminUser; isAdmin: boolean; checkFailed: boolean }

export const SessionContext = createContext<AdminSession | null>(null)

export function useAdminSession(): AdminSession {
  const session = useContext(SessionContext)
  if (!session) throw new Error('AdminSessionProvider is missing')
  return session
}
