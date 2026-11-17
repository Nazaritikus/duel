import { vi } from 'vitest'
import type { AdminApi, AdminCategory, AdminUser } from './adminApi'

/** Test double for `AdminApi` with an in-memory category list. */
export function createFakeAdminApi(
  options: { user?: AdminUser | null; isAdmin?: boolean; categories?: AdminCategory[] } = {},
) {
  let listener: ((user: AdminUser | null) => void) | null = null
  let user = options.user === undefined ? { id: 'u1', email: 'admin@duel.test' } : options.user
  let categories = [...(options.categories ?? [])]
  let nextId = 1

  const api = {
    onAuthChange: vi.fn((cb: (u: AdminUser | null) => void) => {
      listener = cb
      cb(user)
      return () => {
        listener = null
      }
    }),
    requestMagicLink: vi.fn(async () => {}),
    signOut: vi.fn(async () => {
      user = null
      listener?.(null)
    }),
    isAdmin: vi.fn(async () => options.isAdmin ?? true),
    listCategories: vi.fn(async () => [...categories]),
    getCategory: vi.fn(async (id: string) => categories.find((c) => c.id === id) ?? null),
    createCategory: vi.fn(async (fields: { name: string; hint: string }) => {
      const created: AdminCategory = {
        id: `new-${nextId++}`,
        name: fields.name.trim(),
        hint: fields.hint.trim(),
        status: 'draft',
        updatedAt: new Date().toISOString(),
        stats: { photoCount: 0, missingAnswers: 0, verticalCount: 0 },
      }
      categories.push(created)
      return created
    }),
    updateCategory: vi.fn(async (id: string, fields: { name: string; hint: string }) => {
      categories = categories.map((c) => (c.id === id ? { ...c, ...fields } : c))
    }),
    setStatus: vi.fn(async (id: string, status: 'draft' | 'published') => {
      categories = categories.map((c) => (c.id === id ? { ...c, status } : c))
    }),
    deleteCategory: vi.fn(async (id: string) => {
      categories = categories.filter((c) => c.id !== id)
    }),
  } satisfies AdminApi

  return {
    api,
    setUser(next: AdminUser | null) {
      user = next
      listener?.(next)
    },
  }
}

export function category(overrides: Partial<AdminCategory> & { id: string }): AdminCategory {
  return {
    name: overrides.id,
    hint: '',
    status: 'draft',
    updatedAt: new Date().toISOString(),
    stats: { photoCount: 0, missingAnswers: 0, verticalCount: 0 },
    ...overrides,
  }
}
