import { createContext, useContext } from 'react'
import type { TypedSupabaseClient } from '../../lib/supabase'
import type { CategoryStats } from './publishRules'
import type { ProcessedImage } from './upload/image'

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
  /** Signed URL of the first photo (lowest position); only filled by `listCategories`. */
  coverUrl: string | null
}

export interface AdminPhoto {
  id: string
  categoryId: string
  answer: string
  isVertical: boolean
  position: number
  storagePath: string
  answerStoragePath: string | null
  /** Signed URLs (1 h). */
  url: string | null
  answerUrl: string | null
}

export interface NewPhoto {
  categoryId: string
  position: number
  answer: string
  image: ProcessedImage
  answerImage: ProcessedImage | null
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

  listPhotos(categoryId: string): Promise<AdminPhoto[]>
  addPhoto(photo: NewPhoto): Promise<void>
  /** Adds or replaces the answer photo. */
  attachAnswerPhoto(
    photo: Pick<AdminPhoto, 'id' | 'categoryId' | 'answerStoragePath'>,
    image: ProcessedImage,
  ): Promise<void>
  removeAnswerPhoto(photo: Pick<AdminPhoto, 'id' | 'answerStoragePath'>): Promise<void>
  updateAnswer(photoId: string, answer: string): Promise<void>
  deletePhoto(photo: Pick<AdminPhoto, 'id' | 'storagePath' | 'answerStoragePath'>): Promise<void>
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
const SIGNED_URL_TTL = 3600

const contentType = (image: ProcessedImage) => (image.ext === 'webp' ? 'image/webp' : 'image/jpeg')

interface CategoryRow {
  id: string
  name: string
  hint: string | null
  status: CategoryStatus
  updated_at: string
  photos: { answer: string; is_vertical: boolean; storage_path: string; position: number }[]
}

const categorySelect =
  'id, name, hint, status, updated_at, photos(answer, is_vertical, storage_path, position)'

function firstPhotoPath(row: CategoryRow): string | null {
  let first: CategoryRow['photos'][number] | null = null
  for (const p of row.photos) if (!first || p.position < first.position) first = p
  return first?.storage_path ?? null
}

interface PhotoRow {
  id: string
  category_id: string
  answer: string
  is_vertical: boolean
  position: number
  storage_path: string
  answer_storage_path: string | null
}

function toCategory(row: CategoryRow, coverUrl: string | null = null): AdminCategory {
  return {
    coverUrl,
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
      const rows = data as CategoryRow[]
      const covers = await signPaths(rows.map(firstPhotoPath))
      return rows.map((row, i) => toCategory(row, covers[i]))
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

    async listPhotos(categoryId) {
      const { data, error } = await client
        .from('photos')
        .select('id, category_id, answer, is_vertical, position, storage_path, answer_storage_path')
        .eq('category_id', categoryId)
        .order('position')
      if (error) throw dataError(error, 'Не вдалося завантажити фото.')
      const rows = data as PhotoRow[]
      const urls = await signPaths(rows.flatMap((r) => [r.storage_path, r.answer_storage_path]))
      return rows.map((r, i) => ({
        id: r.id,
        categoryId: r.category_id,
        answer: r.answer,
        isVertical: r.is_vertical,
        position: r.position,
        storagePath: r.storage_path,
        answerStoragePath: r.answer_storage_path,
        url: urls[2 * i],
        answerUrl: urls[2 * i + 1],
      }))
    },

    async addPhoto({ categoryId, position, answer, image, answerImage }) {
      const id = crypto.randomUUID()
      const storagePath = `${categoryId}/${id}.${image.ext}`
      const answerPath = answerImage ? `${categoryId}/${id}.answer.${answerImage.ext}` : null
      const uploaded: string[] = []
      const bucket = client.storage.from(PHOTOS_BUCKET)
      try {
        await upload(storagePath, image)
        uploaded.push(storagePath)
        if (answerPath && answerImage) {
          await upload(answerPath, answerImage)
          uploaded.push(answerPath)
        }
        const { error } = await client.from('photos').insert({
          id,
          category_id: categoryId,
          storage_path: storagePath,
          answer_storage_path: answerPath,
          answer: answer.trim(),
          is_vertical: image.height > image.width,
          position,
        })
        if (error) throw dataError(error, 'Не вдалося зберегти фото.')
      } catch (e) {
        if (uploaded.length) await bucket.remove(uploaded)
        throw e
      }
    },

    async attachAnswerPhoto(photo, image) {
      const path = `${photo.categoryId}/${photo.id}.answer.${image.ext}`
      await upload(path, image, true)
      const { error } = await client
        .from('photos')
        .update({ answer_storage_path: path })
        .eq('id', photo.id)
      if (error) throw dataError(error, 'Не вдалося зберегти фото відповіді.')
      if (photo.answerStoragePath && photo.answerStoragePath !== path) {
        await client.storage.from(PHOTOS_BUCKET).remove([photo.answerStoragePath])
      }
    },

    async removeAnswerPhoto(photo) {
      const { error } = await client
        .from('photos')
        .update({ answer_storage_path: null })
        .eq('id', photo.id)
      if (error) throw dataError(error, 'Не вдалося прибрати фото відповіді.')
      if (photo.answerStoragePath) {
        await client.storage.from(PHOTOS_BUCKET).remove([photo.answerStoragePath])
      }
    },

    async updateAnswer(photoId, answer) {
      const { error } = await client
        .from('photos')
        .update({ answer: answer.trim() })
        .eq('id', photoId)
      if (error) throw dataError(error, 'Не вдалося зберегти відповідь.')
    },

    async deletePhoto(photo) {
      const paths = [photo.storagePath, photo.answerStoragePath].filter((p): p is string => !!p)
      const { error: removeError } = await client.storage.from(PHOTOS_BUCKET).remove(paths)
      if (removeError) throw new AdminApiError('Не вдалося видалити файли фото.')
      const { error } = await client.from('photos').delete().eq('id', photo.id)
      if (error) throw dataError(error, 'Не вдалося видалити фото.')
    },
  }

  /** Signs storage paths in one request; null for missing paths or on failure. */
  async function signPaths(paths: (string | null)[]): Promise<(string | null)[]> {
    const present = paths.filter((p): p is string => !!p)
    if (!present.length) return paths.map(() => null)
    const { data, error } = await client.storage
      .from(PHOTOS_BUCKET)
      .createSignedUrls(present, SIGNED_URL_TTL)
    if (error || !data) return paths.map(() => null)
    const byPath = new Map(data.map((d) => [d.path, d.signedUrl ?? null]))
    return paths.map((p) => (p ? (byPath.get(p) ?? null) : null))
  }

  async function upload(path: string, image: ProcessedImage, upsert = false) {
    const { error } = await client.storage
      .from(PHOTOS_BUCKET)
      .upload(path, image.blob, { contentType: contentType(image), upsert })
    if (error) throw new AdminApiError('Не вдалося завантажити файл у сховище.')
  }
}
