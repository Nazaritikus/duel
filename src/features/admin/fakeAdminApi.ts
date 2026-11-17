import { vi } from 'vitest'
import type { AdminApi, AdminCategory, AdminPhoto, AdminUser, NewPhoto } from './adminApi'
import type { ProcessedImage } from './upload/image'

/** Test double for `AdminApi` with an in-memory category list. */
export function createFakeAdminApi(
  options: {
    user?: AdminUser | null
    isAdmin?: boolean
    categories?: AdminCategory[]
    photos?: AdminPhoto[]
  } = {},
) {
  // Without explicit photos, generate ones matching each category's stats, like the DB would.
  let photos =
    options.photos ??
    (options.categories ?? []).flatMap((c) =>
      Array.from({ length: c.stats.photoCount }, (_, i) =>
        photo({
          id: `${c.id}-${i}`,
          categoryId: c.id,
          answer: i < c.stats.missingAnswers ? '' : `${c.name} ${i}`,
          isVertical: i < c.stats.verticalCount,
          position: i,
        }),
      ),
    )
  let nextPhoto = 1
  /** Category stats follow the in-memory photos, like the DB does. */
  const withStats = (c: AdminCategory): AdminCategory => {
    const own = photos.filter((p) => p.categoryId === c.id)
    return {
      ...c,
      stats: {
        photoCount: own.length,
        missingAnswers: own.filter((p) => p.answer.trim() === '').length,
        verticalCount: own.filter((p) => p.isVertical).length,
      },
    }
  }
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
    listCategories: vi.fn(async () => categories.map(withStats)),
    getCategory: vi.fn(async (id: string) => {
      const found = categories.find((c) => c.id === id)
      return found ? withStats(found) : null
    }),
    createCategory: vi.fn(async (fields: { name: string; hint: string }) => {
      const created: AdminCategory = {
        id: `new-${nextId++}`,
        name: fields.name.trim(),
        hint: fields.hint.trim(),
        status: 'draft',
        updatedAt: new Date().toISOString(),
        stats: { photoCount: 0, missingAnswers: 0, verticalCount: 0 },
        coverUrl: null,
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
    listPhotos: vi.fn(async (categoryId: string) =>
      photos.filter((p) => p.categoryId === categoryId).sort((a, b) => a.position - b.position),
    ),
    addPhoto: vi.fn(async (photo: NewPhoto) => {
      const id = `photo-${nextPhoto++}`
      photos.push({
        id,
        categoryId: photo.categoryId,
        answer: photo.answer.trim(),
        isVertical: photo.image.height > photo.image.width,
        position: photo.position,
        storagePath: `${photo.categoryId}/${id}.${photo.image.ext}`,
        answerStoragePath: photo.answerImage ? `${photo.categoryId}/${id}.answer.webp` : null,
        url: `blob:${id}`,
        answerUrl: photo.answerImage ? `blob:${id}.answer` : null,
      })
    }),
    attachAnswerPhoto: vi.fn(
      async (
        photo: Pick<AdminPhoto, 'id' | 'categoryId' | 'answerStoragePath'>,
        _image: ProcessedImage,
      ) => {
        photos = photos.map((p) =>
          p.id === photo.id
            ? {
                ...p,
                answerStoragePath: `${p.categoryId}/${p.id}.answer.webp`,
                answerUrl: `blob:${p.id}.answer2`,
              }
            : p,
        )
      },
    ),
    removeAnswerPhoto: vi.fn(async (photo: Pick<AdminPhoto, 'id' | 'answerStoragePath'>) => {
      photos = photos.map((p) =>
        p.id === photo.id ? { ...p, answerStoragePath: null, answerUrl: null } : p,
      )
    }),
    updateAnswer: vi.fn(async (photoId: string, answer: string) => {
      photos = photos.map((p) => (p.id === photoId ? { ...p, answer: answer.trim() } : p))
    }),
    deletePhoto: vi.fn(async (photo: Pick<AdminPhoto, 'id'>) => {
      photos = photos.filter((p) => p.id !== photo.id)
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
    coverUrl: null,
    ...overrides,
  }
}

export function photo(
  overrides: Partial<AdminPhoto> & { id: string; categoryId: string },
): AdminPhoto {
  return {
    answer: overrides.id,
    isVertical: false,
    position: 0,
    storagePath: `${overrides.categoryId}/${overrides.id}.webp`,
    answerStoragePath: null,
    url: `blob:${overrides.id}`,
    answerUrl: null,
    ...overrides,
  }
}

export const fakeImage = (width = 1600, height = 1200): ProcessedImage => ({
  blob: new Blob(['x'], { type: 'image/webp' }),
  ext: 'webp',
  width,
  height,
})
