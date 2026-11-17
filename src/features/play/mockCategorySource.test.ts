import { describe, expect, it, vi } from 'vitest'
import catalog from '../../../public/mock/catalog.json'
import {
  createMockCategorySource,
  MOCK_CATALOG_URL,
  parseCatalog,
  parseCategory,
} from './mockCategorySource'

const okFetch = () => vi.fn(async () => new Response(JSON.stringify(catalog)))

describe('mock catalog', () => {
  it('has 3 valid categories with vertical photos and answer photos', () => {
    const categories = parseCatalog(catalog)
    expect(categories.map((c) => [c.name, c.photos.length])).toEqual([
      ['Фігури та кольори', 12],
      ['Цифри', 10],
      ['Стрілки', 8],
    ])
    const photos = categories.flatMap((c) => c.photos)
    expect(new Set(photos.map((p) => p.id)).size).toBe(photos.length)
    expect(photos.filter((p) => p.isVertical).length).toBeGreaterThanOrEqual(2)
    expect(photos.filter((p) => p.answerSrc).length).toBeGreaterThanOrEqual(2)
  })

  it('rejects invalid categories', () => {
    expect(() => parseCategory({ id: 'x', name: 'y', photos: [] })).toThrow()
    expect(() => parseCategory({ id: 'x', name: 'y', photos: [{ id: 1 }] })).toThrow()
    expect(() => parseCatalog({})).toThrow()
  })
})

describe('createMockCategorySource', () => {
  it('lists categories with photo counts', async () => {
    const fetchFn = okFetch()
    const source = createMockCategorySource(fetchFn as unknown as typeof fetch)
    expect(await source.listCategories()).toEqual([
      { id: 'shapes', name: 'Фігури та кольори', photoCount: 12 },
      { id: 'digits', name: 'Цифри', photoCount: 10 },
      { id: 'arrows', name: 'Стрілки', photoCount: 8 },
    ])
    expect(fetchFn).toHaveBeenCalledWith(MOCK_CATALOG_URL)
  })

  it('loads a category by id, fetching the catalog once', async () => {
    const fetchFn = okFetch()
    const source = createMockCategorySource(fetchFn as unknown as typeof fetch)
    await source.listCategories()
    const digits = await source.loadCategory('digits')
    expect(digits.name).toBe('Цифри')
    expect(digits.photos).toHaveLength(10)
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })

  it('rejects an unknown id', async () => {
    const source = createMockCategorySource(okFetch() as unknown as typeof fetch)
    await expect(source.loadCategory('nope')).rejects.toThrow('Unknown category')
  })

  it('rejects on an HTTP error and retries on the next call', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(new Response('nope', { status: 500 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(catalog)))
    const source = createMockCategorySource(fetchFn as unknown as typeof fetch)
    await expect(source.listCategories()).rejects.toThrow('500')
    await expect(source.listCategories()).resolves.toHaveLength(3)
  })
})
