import type { CategorySource, PlayCategory, PlayPhoto } from './types'

export const MOCK_CATALOG_URL = '/mock/catalog.json'

function isPhoto(value: unknown): value is PlayPhoto {
  if (typeof value !== 'object' || value === null) return false
  const p = value as Record<string, unknown>
  return (
    typeof p.id === 'string' &&
    typeof p.src === 'string' &&
    (p.answerSrc === null || typeof p.answerSrc === 'string') &&
    typeof p.answer === 'string' &&
    typeof p.isVertical === 'boolean'
  )
}

export function parseCategory(value: unknown): PlayCategory {
  if (typeof value !== 'object' || value === null) throw new Error('Invalid category')
  const c = value as Record<string, unknown>
  if (typeof c.id !== 'string' || typeof c.name !== 'string' || !Array.isArray(c.photos)) {
    throw new Error('Invalid category')
  }
  if (c.photos.length === 0 || !c.photos.every(isPhoto)) throw new Error('Invalid category photos')
  return { id: c.id, name: c.name, photos: c.photos }
}

export function parseCatalog(value: unknown): PlayCategory[] {
  if (!Array.isArray(value)) throw new Error('Invalid catalog')
  return value.map(parseCategory)
}

/** Reads the generated mock catalog; the whole file is fetched once and cached. */
export function createMockCategorySource(
  fetchFn: typeof fetch = (...args) => fetch(...args),
): CategorySource {
  let catalog: Promise<PlayCategory[]> | null = null
  const load = () => {
    catalog ??= fetchFn(MOCK_CATALOG_URL).then(async (res) => {
      if (!res.ok) throw new Error(`Failed to load mock catalog: HTTP ${res.status}`)
      return parseCatalog(await res.json())
    })
    // A failed load is not cached, so a retry fetches again.
    catalog.catch(() => (catalog = null))
    return catalog
  }

  return {
    async listCategories() {
      const categories = await load()
      return categories.map((c) => ({ id: c.id, name: c.name, photoCount: c.photos.length }))
    },
    async loadCategory(id) {
      const category = (await load()).find((c) => c.id === id)
      if (!category) throw new Error(`Unknown category: ${id}`)
      return category
    },
  }
}
