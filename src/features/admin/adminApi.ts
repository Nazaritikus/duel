import { createContext, useContext } from 'react'
import type { TypedSupabaseClient } from '../../lib/supabase'
import type { CategoryStats } from './publishRules'

export type CategoryStatus = 'draft' | 'published'

export interface AdminUser {
  id: string
  email: string
}

export interface AdminCategory {
  id: string
  name: string
  hint: string
  status: CategoryStatus
  updatedAt: string
  stats: CategoryStats
}

export interface CategoryFields {
  name: string
  hint: string
}

/** Everything the admin UI needs from the backend; tests pass a fake. */
export interface AdminApi {
  /** Subscribes to the signed-in user; called once with the current state, then on changes. */
  onAuthChange(callback: (user: AdminUser | null) => void): () => void
  /** Sends a magic link. Resolves the same way for unknown emails (no account is created). */
  requestMagicLink(email: string): Promise<void>
  signOut(): Promise<void>
  isAdmin(userId: string): Promise<boolean>

  listCategories(): Promise<AdminCategory[]>
  getCategory(id: string): Promise<AdminCategory | null>
  createCategory(fields: CategoryFields): Promise<AdminCategory>
  updateCategory(id: string, fields: CategoryFields): Promise<void>
  setStatus(id: string, status: CategoryStatus): Promise<void>
  deleteCategory(id: string): Promise<void>
}

/** An error whose message is safe to show to the admin (Ukrainian). */
export class AdminApiError extends Error {}

export const AdminApiContext = createContext<AdminApi | null>(null)

export function useAdminApi(): AdminApi {
  const api = useContext(AdminApiContext)
  if (!api) throw new Error('AdminApiContext is missing')
  return api
}

const PHOTOS_BUCKET = 'photos'
const LIST_PAGE = 1000

interface CategoryRow {
  id: string
  name: string
  hint: string | null
  status: CategoryStatus
  updated_at: string
  photos: { answer: string; is_vertical: boolean }[]
}

const categorySelect = 'id, name, hint, status, updated_at, photos(answer, is_vertical)'

function toCategory(row: CategoryRow): AdminCategory {
  return {
    id: row.id,
    name: row.name,
    hint: row.hint ?? '',
    status: row.status,
    updatedAt: row.updated_at,
    stats: {
      photoCount: row.photos.length,
      missingAnswers: row.photos.filter((p) => p.answer.trim() === '').length,
      verticalCount: row.photos.filter((p) => p.is_vertical).length,
    },
  }
}

interface ErrorLike {
  code?: string
  status?: number
  message?: string
}

/** Errors that mean "no such user" when signups through OTP are disabled. */
const UNKNOWN_USER_CODES = new Set(['otp_disabled', 'signup_disabled', 'user_not_found'])

function authMessage(error: ErrorLike): string {
  if (error.status === 429 || error.code?.startsWith('over_')) {
    return 'Забагато запитів. Зачекайте кілька хвилин і спробуйте ще раз.'
  }
  return 'Не вдалося надіслати посилання. Перевірте адресу та з’єднання.'
}

function dataError(error: ErrorLike, fallback: string): AdminApiError {
  if (error.code === '23514') {
    return new AdminApiError('Категорія не відповідає правилам публікації.')
  }
  if (error.code === '42501') return new AdminApiError('Немає прав на цю дію.')
  return new AdminApiError(fallback)
}

function cleanFields(fields: CategoryFields) {
  const hint = fields.hint.trim()
  return { name: fields.name.trim(), hint: hint === '' ? null : hint }
}

export function createSupabaseAdminApi(
  client: TypedSupabaseClient,
  redirectTo: () => string = () => `${window.location.origin}/admin`,
): AdminApi {
  const toUser = (user: { id: string; email?: string } | null | undefined): AdminUser | null =>
    user ? { id: user.id, email: user.email ?? '' } : null

  return {
    onAuthChange(callback) {
      // supabase-js emits INITIAL_SESSION on subscribe, then every change.
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        callback(toUser(session?.user))
      })
      return () => data.subscription.unsubscribe()
    },

    async requestMagicLink(email) {
      const { error } = await client.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: false, emailRedirectTo: redirectTo() },
      })
      if (!error) return
      const e = error as ErrorLike
      if (
        (e.code && UNKNOWN_USER_CODES.has(e.code)) ||
        /signups not allowed/i.test(e.message ?? '')
      ) {
        return
      }
      throw new AdminApiError(authMessage(e))
    },

    async signOut() {
      await client.auth.signOut()
    },

    async isAdmin(userId) {
      const { data, error } = await client
        .from('admins')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) throw new AdminApiError('Не вдалося перевірити доступ.')
      return data !== null
    },

    async listCategories() {
      const { data, error } = await client
        .from('categories')
        .select(categorySelect)
        .order('updated_at', { ascending: false })
      if (error) throw dataError(error, 'Не вдалося завантажити категорії.')
      return (data as CategoryRow[]).map(toCategory)
    },

    async getCategory(id) {
      const { data, error } = await client
        .from('categories')
        .select(categorySelect)
        .eq('id', id)
        .maybeSingle()
      if (error) throw dataError(error, 'Не вдалося завантажити категорію.')
      return data ? toCategory(data as CategoryRow) : null
    },

    async createCategory(fields) {
      const { data, error } = await client
        .from('categories')
        .insert(cleanFields(fields))
        .select(categorySelect)
        .single()
      if (error) throw dataError(error, 'Не вдалося створити категорію.')
      return toCategory(data as CategoryRow)
    },

    async updateCategory(id, fields) {
      const { error } = await client.from('categories').update(cleanFields(fields)).eq('id', id)
      if (error) throw dataError(error, 'Не вдалося зберегти категорію.')
    },

    async setStatus(id, status) {
      const { error } = await client.from('categories').update({ status }).eq('id', id)
      if (error) throw dataError(error, 'Не вдалося змінити статус.')
    },

    async deleteCategory(id) {
      // Files first: a failed row delete can be retried, orphaned files could not be found.
      const bucket = client.storage.from(PHOTOS_BUCKET)
      for (;;) {
        const { data: files, error } = await bucket.list(id, { limit: LIST_PAGE })
        if (error) throw new AdminApiError('Не вдалося видалити файли категорії.')
        if (!files.length) break
        const { error: removeError } = await bucket.remove(files.map((f) => `${id}/${f.name}`))
        if (removeError) throw new AdminApiError('Не вдалося видалити файли категорії.')
        if (files.length < LIST_PAGE) break
      }
      const { error } = await client.from('categories').delete().eq('id', id)
      if (error) throw dataError(error, 'Не вдалося видалити категорію.')
    },
  }
}
