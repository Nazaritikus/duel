import type { SupabaseClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { TypedSupabaseClient } from '../../src/lib/supabase'
import { createSupabaseCategorySource } from '../../src/features/play/supabaseCategorySource'
import {
  anon,
  createCategory,
  createUser,
  deleteCategory,
  deleteUser,
  service,
  svg,
  type TestUser,
} from './helpers'

let admin: TestUser
let published: { id: string; name: string }
let draft: { id: string }

const sourceFor = (client: SupabaseClient) =>
  createSupabaseCategorySource(async () => client as unknown as TypedSupabaseClient)

beforeAll(async () => {
  admin = await createUser({ admin: true })
  published = await createCategory('published', 2)
  draft = await createCategory('draft', 2)
  // Real files for the published category so URLs can be signed and downloaded.
  const { data: photos } = await service
    .from('photos')
    .select('storage_path')
    .eq('category_id', published.id)
  for (const p of photos!) {
    await service.storage
      .from('photos')
      .upload(p.storage_path, svg(p.storage_path), { upsert: true })
  }
})

afterAll(async () => {
  await deleteCategory(published.id)
  await deleteCategory(draft.id)
  await deleteUser(admin)
})

describe('game category source', () => {
  it('lists published categories only, for anon and for a signed-in admin', async () => {
    for (const client of [anon(), admin.client]) {
      const ids = (await sourceFor(client).listCategories()).map((c) => c.id)
      expect(ids).toContain(published.id)
      expect(ids).not.toContain(draft.id)
    }
  })

  it('refuses to load a draft even for an admin', async () => {
    await expect(sourceFor(admin.client).loadCategory(draft.id)).rejects.toBeTruthy()
  })

  it('loads a published category with downloadable signed URLs for anon', async () => {
    const category = await sourceFor(anon()).loadCategory(published.id)
    expect(category.photos).toHaveLength(2)
    const res = await fetch(category.photos[0].src)
    expect(res.status).toBe(200)
  })
})
