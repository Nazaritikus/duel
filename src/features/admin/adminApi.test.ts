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
