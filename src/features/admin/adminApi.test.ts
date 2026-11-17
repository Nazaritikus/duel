import { describe, expect, it, vi } from 'vitest'
import type { TypedSupabaseClient } from '../../lib/supabase'
import { AdminApiError, createSupabaseAdminApi } from './adminApi'

function authClient(error: unknown) {
  const signInWithOtp = vi.fn(async () => ({ data: {}, error }))
  const client = { auth: { signInWithOtp } } as unknown as TypedSupabaseClient
  return { api: createSupabaseAdminApi(client, () => 'http://x/admin'), signInWithOtp }
}

describe('requestMagicLink', () => {
  it('never creates users and redirects back to the admin', async () => {
    const { api, signInWithOtp } = authClient(null)
    await api.requestMagicLink(' a@b.c ')
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'a@b.c',
      options: { shouldCreateUser: false, emailRedirectTo: 'http://x/admin' },
    })
  })

  it('treats an unknown email like a sent link', async () => {
    await expect(
      authClient({
        code: 'otp_disabled',
        status: 422,
        message: 'Signups not allowed for otp',
      }).api.requestMagicLink('x@y.z'),
    ).resolves.toBeUndefined()
  })

  it('surfaces rate limiting', async () => {
    await expect(
      authClient({ code: 'over_email_send_rate_limit', status: 429 }).api.requestMagicLink('x@y.z'),
    ).rejects.toThrow(/Забагато запитів/)
  })

  it('surfaces other errors', async () => {
    await expect(authClient({ status: 500 }).api.requestMagicLink('x@y.z')).rejects.toBeInstanceOf(
      AdminApiError,
    )
  })
})

describe('deleteCategory', () => {
  it('removes the storage files before the row', async () => {
    const calls: string[] = []
    const bucket = {
      list: vi.fn(async () => {
        calls.push('list')
        return calls.filter((c) => c === 'list').length === 1
          ? { data: [{ name: 'a.webp' }, { name: 'a.answer.webp' }], error: null }
          : { data: [], error: null }
      }),
      remove: vi.fn(async (paths: string[]) => {
        calls.push(`remove ${paths.join(',')}`)
        return { data: [], error: null }
      }),
    }
    const client = {
      storage: { from: () => bucket },
      from: () => ({
        delete: () => ({
          eq: async (_col: string, id: string) => {
            calls.push(`delete ${id}`)
            return { error: null }
          },
        }),
      }),
    } as unknown as TypedSupabaseClient
    await createSupabaseAdminApi(client).deleteCategory('c1')
    expect(calls).toEqual(['list', 'remove c1/a.webp,c1/a.answer.webp', 'delete c1'])
  })
})

describe('data errors', () => {
  it('explains a publish-rule rejection', async () => {
    const client = {
      from: () => ({
        update: () => ({ eq: async () => ({ error: { code: '23514', message: 'x' } }) }),
      }),
    } as unknown as TypedSupabaseClient
    await expect(createSupabaseAdminApi(client).setStatus('c1', 'published')).rejects.toThrow(
      'Категорія не відповідає правилам публікації.',
    )
  })
})

const image = { blob: new Blob(['x']), ext: 'webp' as const, width: 900, height: 1200 }

function storageClient(insertError: unknown = null) {
  const calls: string[] = []
  const bucket = {
    upload: vi.fn(async (path: string) => {
      calls.push(`upload ${path}`)
      return { data: {}, error: null }
    }),
    remove: vi.fn(async (paths: string[]) => {
      calls.push(`remove ${paths.join(',')}`)
      return { data: [], error: null }
    }),
  }
  const table = {
    insert: vi.fn(async (row: { id: string; is_vertical: boolean }) => {
      calls.push(`insert vertical=${row.is_vertical}`)
      return { error: insertError }
    }),
    update: vi.fn((values: object) => ({
      eq: async () => {
        calls.push(`update ${JSON.stringify(values)}`)
        return { error: null }
      },
    })),
    delete: vi.fn(() => ({
      eq: async () => {
        calls.push('delete row')
        return { error: null }
      },
    })),
  }
  const client = {
    storage: { from: () => bucket },
    from: () => table,
  } as unknown as TypedSupabaseClient
  return { api: createSupabaseAdminApi(client), calls }
}

describe('photo methods', () => {
  it('uploads both files, then inserts the row with is_vertical', async () => {
    const { api, calls } = storageClient()
    await api.addPhoto({
      categoryId: 'c1',
      position: 3,
      answer: ' Fiat ',
      image,
      answerImage: image,
    })
    expect(calls[0]).toMatch(/^upload c1\/[0-9a-f-]{36}\.webp$/)
    expect(calls[1]).toMatch(/^upload c1\/[0-9a-f-]{36}\.answer\.webp$/)
    expect(calls[2]).toBe('insert vertical=true')
    expect(calls).toHaveLength(3)
  })

  it('removes uploaded files when the insert fails', async () => {
    const { api, calls } = storageClient({ code: '23505' })
    await expect(
      api.addPhoto({ categoryId: 'c1', position: 0, answer: 'A', image, answerImage: null }),
    ).rejects.toBeInstanceOf(AdminApiError)
    expect(calls.at(-1)).toMatch(/^remove c1\/[0-9a-f-]{36}\.webp$/)
  })

  it('deletes files before the row', async () => {
    const { api, calls } = storageClient()
    await api.deletePhoto({
      id: 'p1',
      storagePath: 'c1/p1.webp',
      answerStoragePath: 'c1/p1.answer.jpg',
    })
    expect(calls).toEqual(['remove c1/p1.webp,c1/p1.answer.jpg', 'delete row'])
  })

  it('removes an old answer file with another extension after replacing it', async () => {
    const { api, calls } = storageClient()
    await api.attachAnswerPhoto(
      { id: 'p1', categoryId: 'c1', answerStoragePath: 'c1/p1.answer.jpg' },
      image,
    )
    expect(calls).toEqual([
      'upload c1/p1.answer.webp',
      'update {"answer_storage_path":"c1/p1.answer.webp"}',
      'remove c1/p1.answer.jpg',
    ])
  })

  it('keeps the file when the replacement has the same path', async () => {
    const { api, calls } = storageClient()
    await api.attachAnswerPhoto(
      { id: 'p1', categoryId: 'c1', answerStoragePath: 'c1/p1.answer.webp' },
      image,
    )
    expect(calls).toHaveLength(2)
  })
})
