import type { PlayCategory, PlayPhoto } from './types'

export const MOCK_CATEGORY_URL = '/mock/category.json'

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

export async function loadMockCategory(fetchFn: typeof fetch = fetch): Promise<PlayCategory> {
  const res = await fetchFn(MOCK_CATEGORY_URL)
  if (!res.ok) throw new Error(`Failed to load mock category: HTTP ${res.status}`)
  return parseCategory(await res.json())
}
