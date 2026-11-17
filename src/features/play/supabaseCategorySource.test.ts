import { describe, expect, it, vi } from 'vitest'
import type { TypedSupabaseClient } from '../../lib/supabase'
import { createSupabaseCategorySource, SIGNED_URL_TTL } from './supabaseCategorySource'

function stubClient(result: { data: unknown; error: unknown }, signed: unknown = []) {
  const eqs: [string, string][] = []
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn((col: string, value: string) => {
      eqs.push([col, value])
      return query
    }),
    single: vi.fn(async () => result),
    then: (resolve: (r: unknown) => void) => resolve(result),
  }
  const createSignedUrls = vi.fn(async () => ({ data: signed, error: null }))
  const client = {
    from: vi.fn(() => query),
    storage: { from: () => ({ createSignedUrls }) },
  } as unknown as TypedSupabaseClient
  return { source: createSupabaseCategorySource(async () => client), eqs, createSignedUrls }
}

describe('listCategories', () => {
  it('lists published categories with photos, sorted by name', async () => {
    const { source, eqs } = stubClient({
      data: [
        { id: 'b', name: 'Цифри', photos: [{ count: 60 }] },
        { id: 'e', name: 'Порожня', photos: [{ count: 0 }] },
        { id: 'a', name: 'Автомобілі', photos: [{ count: 72 }] },
      ],
      error: null,
    })
    expect(await source.listCategories()).toEqual([
      { id: 'a', name: 'Автомобілі', photoCount: 72 },
      { id: 'b', name: 'Цифри', photoCount: 60 },
    ])
    expect(eqs).toEqual([['status', 'published']])
  })

  it('throws on a query error', async () => {
    const { source } = stubClient({ data: null, error: { message: 'down' } })
    await expect(source.listCategories()).rejects.toBeTruthy()
  })
})

describe('loadCategory', () => {
  const row = (id: string, position: number, answerPath: string | null = null) => ({
    id,
    storage_path: `c/${id}.webp`,
    answer_storage_path: answerPath,
    answer: `A ${id}`,
    is_vertical: id === 'p2',
    position,
  })

  it('maps signed URLs in position order and requires published', async () => {
    const { source, eqs, createSignedUrls } = stubClient(
      {
        data: { id: 'c', name: 'Авто', photos: [row('p2', 1), row('p1', 0, 'c/p1.answer.webp')] },
        error: null,
      },
      [
        { path: 'c/p1.webp', signedUrl: 'https://s/p1' },
        { path: 'c/p1.answer.webp', signedUrl: 'https://s/p1a' },
        { path: 'c/p2.webp', signedUrl: 'https://s/p2' },
      ],
    )
    const category = await source.loadCategory('c')
    expect(eqs).toEqual([
      ['id', 'c'],
      ['status', 'published'],
    ])
    expect(createSignedUrls).toHaveBeenCalledWith(
      ['c/p1.webp', 'c/p1.answer.webp', 'c/p2.webp'],
      SIGNED_URL_TTL,
    )
    expect(category).toEqual({
      id: 'c',
      name: 'Авто',
      photos: [
        {
          id: 'p1',
          src: 'https://s/p1',
          answerSrc: 'https://s/p1a',
          answer: 'A p1',
          isVertical: false,
        },
        { id: 'p2', src: 'https://s/p2', answerSrc: null, answer: 'A p2', isVertical: true },
      ],
    })
  })

  it('drops photos whose URL could not be signed and throws when none are left', async () => {
    const partial = stubClient(
      { data: { id: 'c', name: 'Авто', photos: [row('p1', 0), row('p2', 1)] }, error: null },
      [
        { path: 'c/p1.webp', signedUrl: null, error: 'not found' },
        { path: 'c/p2.webp', signedUrl: 'https://s/p2' },
      ],
    )
    expect((await partial.source.loadCategory('c')).photos.map((p) => p.id)).toEqual(['p2'])

    const none = stubClient({ data: { id: 'c', name: 'Авто', photos: [] }, error: null })
    await expect(none.source.loadCategory('c')).rejects.toThrow(/no playable photos/)
  })

  it('throws for a draft or missing category', async () => {
    const { source } = stubClient({ data: null, error: { code: 'PGRST116' } })
    await expect(source.loadCategory('draft')).rejects.toBeTruthy()
  })
})
