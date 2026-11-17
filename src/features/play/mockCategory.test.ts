import { describe, expect, it, vi } from 'vitest'
import manifest from '../../../public/mock/category.json'
import { loadMockCategory, MOCK_CATEGORY_URL, parseCategory } from './mockCategory'

describe('mock category manifest', () => {
  it('matches PlayCategory with vertical photos and answer photos', () => {
    const category = parseCategory(manifest)
    expect(category.photos.length).toBeGreaterThanOrEqual(12)
    expect(category.photos.filter((p) => p.isVertical).length).toBeGreaterThanOrEqual(2)
    expect(category.photos.filter((p) => p.answerSrc).length).toBeGreaterThanOrEqual(2)
  })
})

describe('loadMockCategory', () => {
  it('fetches and parses the manifest', async () => {
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(manifest)))
    const category = await loadMockCategory(fetchFn as unknown as typeof fetch)
    expect(fetchFn).toHaveBeenCalledWith(MOCK_CATEGORY_URL)
    expect(category.name).toBe(manifest.name)
  })

  it('rejects on an HTTP error', async () => {
    const fetchFn = vi.fn(async () => new Response('nope', { status: 404 }))
    await expect(loadMockCategory(fetchFn as unknown as typeof fetch)).rejects.toThrow('404')
  })

  it('rejects an invalid manifest', () => {
    expect(() => parseCategory({ id: 'x', name: 'y', photos: [] })).toThrow()
    expect(() => parseCategory({ id: 'x', name: 'y', photos: [{ id: 1 }] })).toThrow()
  })
})
