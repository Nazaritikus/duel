import { createClient, type SupabaseClient } from '@supabase/supabase-js'
// @ts-expect-error -- plain ESM script shared with the CLI scripts
import { localEnv } from '../../scripts/supabase-env.mjs'

export const env = localEnv() as { url: string; publishableKey: string; secretKey: string }

const noSession = { auth: { persistSession: false, autoRefreshToken: false } }

/** Bypasses RLS: test setup and assertions only. */
export const service: SupabaseClient = createClient(env.url, env.secretKey, noSession)

export const anon = (): SupabaseClient => createClient(env.url, env.publishableKey, noSession)

export interface TestUser {
  id: string
  client: SupabaseClient
}

/** Creates a throwaway local user (random email/password) and returns a signed-in client. */
export async function createUser(options: { admin?: boolean } = {}): Promise<TestUser> {
  const email = `test-${crypto.randomUUID()}@duel.test`
  const password = crypto.randomUUID()
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) throw error
  const id = data.user.id
  if (options.admin) {
    const { error: grantError } = await service.from('admins').insert({ user_id: id })
    if (grantError) throw grantError
  }
  const client = createClient(env.url, env.publishableKey, noSession)
  const { error: signInError } = await client.auth.signInWithPassword({ email, password })
  if (signInError) throw signInError
  return { id, client }
}

export async function deleteUser(user: TestUser | undefined) {
  if (user) await service.auth.admin.deleteUser(user.id)
}

export async function createCategory(status: 'draft' | 'published', photoCount = 0) {
  const { data, error } = await service
    .from('categories')
    .insert({ name: `Test ${crypto.randomUUID().slice(0, 8)}`, status })
    .select()
    .single()
  if (error) throw error
  if (photoCount > 0) {
    const rows = Array.from({ length: photoCount }, (_, position) => ({
      category_id: data.id,
      storage_path: `${data.id}/${crypto.randomUUID()}.webp`,
      answer: `Answer ${position}`,
      position,
    }))
    const { error: photoError } = await service.from('photos').insert(rows)
    if (photoError) throw photoError
  }
  return data as { id: string; name: string; status: string; updated_at: string }
}

export async function deleteCategory(id: string) {
  const { data } = await service.storage.from('photos').list(id)
  if (data?.length) await service.storage.from('photos').remove(data.map((f) => `${id}/${f.name}`))
  await service.from('categories').delete().eq('id', id)
}

export const svg = (label: string) =>
  new Blob([`<svg xmlns="http://www.w3.org/2000/svg"><text>${label}</text></svg>`], {
    type: 'image/svg+xml',
  })

/** A tiny file sent as WebP; storage checks the declared type, not the bytes. */
export const webp = (label: string) => new Blob([`RIFF${label}WEBP`], { type: 'image/webp' })
