import { afterAll, beforeAll, describe, expect, it } from 'vitest'
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
let plain: TestUser
let published: { id: string }
let draft: { id: string }
const extraCategories: string[] = []

beforeAll(async () => {
  admin = await createUser({ admin: true })
  plain = await createUser()
  published = await createCategory('published', 3)
  draft = await createCategory('draft', 2)
})

afterAll(async () => {
  for (const id of [published?.id, draft?.id, ...extraCategories]) if (id) await deleteCategory(id)
  await deleteUser(admin)
  await deleteUser(plain)
})

describe('anonymous visitors', () => {
  it('see published categories but not drafts', async () => {
    const { data, error } = await anon()
      .from('categories')
      .select('id')
      .in('id', [published.id, draft.id])
    expect(error).toBeNull()
    expect(data!.map((c) => c.id)).toEqual([published.id])
  })

  it('see photos of published categories only', async () => {
    const { data } = await anon()
      .from('photos')
      .select('category_id')
      .in('category_id', [published.id, draft.id])
    expect(data).toHaveLength(3)
    expect(new Set(data!.map((p) => p.category_id))).toEqual(new Set([published.id]))
  })

  it('cannot insert photos', async () => {
    const { error } = await anon()
      .from('photos')
      .insert({ category_id: published.id, storage_path: `${published.id}/x.webp`, position: 99 })
    expect(error?.code).toBe('42501')
  })

  it('cannot insert, update or delete categories', async () => {
    const client = anon()
    expect((await client.from('categories').insert({ name: 'Hack' })).error?.code).toBe('42501')
    const upd = await client
      .from('categories')
      .update({ name: 'Hack' })
      .eq('id', published.id)
      .select()
    expect(upd.data ?? []).toHaveLength(0)
    const del = await client.from('categories').delete().eq('id', published.id).select()
    expect(del.data ?? []).toHaveLength(0)
    const { data } = await service.from('categories').select('name').eq('id', published.id).single()
    expect(data!.name).not.toBe('Hack')
  })
})

describe('signed-in non-admin', () => {
  it('reads like an anonymous visitor', async () => {
    const { data } = await plain.client
      .from('categories')
      .select('id')
      .in('id', [published.id, draft.id])
    expect(data!.map((c) => c.id)).toEqual([published.id])
  })

  it('cannot write categories or photos', async () => {
    const insert = await plain.client.from('categories').insert({ name: 'Mine' })
    expect(insert.error?.code).toBe('42501')
    const update = await plain.client
      .from('categories')
      .update({ status: 'draft' })
      .eq('id', published.id)
      .select()
    expect(update.data ?? []).toHaveLength(0)
    const photo = await plain.client
      .from('photos')
      .insert({ category_id: published.id, storage_path: `${published.id}/y.webp`, position: 98 })
    expect(photo.error?.code).toBe('42501')
  })

  it('is not an admin: sees no admin row', async () => {
    const { data } = await plain.client.from('admins').select('user_id')
    expect(data).toEqual([])
  })

  it('cannot add themselves to the allowlist', async () => {
    const { error } = await plain.client.from('admins').insert({ user_id: plain.id })
    expect(error).not.toBeNull()
  })
})

describe('admin', () => {
  it('sees only their own admin row', async () => {
    const { data } = await admin.client.from('admins').select('user_id')
    expect(data).toEqual([{ user_id: admin.id }])
  })

  it('creates a draft category with a photo and reads drafts', async () => {
    const created = await admin.client
      .from('categories')
      .insert({ name: 'Admin draft' })
      .select()
      .single()
    expect(created.error).toBeNull()
    extraCategories.push(created.data!.id)
    const photo = await admin.client.from('photos').insert({
      category_id: created.data!.id,
      storage_path: `${created.data!.id}/a.webp`,
      answer: 'A',
      position: 0,
    })
    expect(photo.error).toBeNull()

    const { data } = await admin.client
      .from('categories')
      .select('id, status')
      .in('id', [draft.id, created.data!.id])
    expect(data).toHaveLength(2)
  })

  it('a second admin on the allowlist has the same rights', async () => {
    const second = await createUser({ admin: true })
    try {
      const { data, error } = await second.client
        .from('categories')
        .update({ hint: 'edited by second admin' })
        .eq('id', draft.id)
        .select()
      expect(error).toBeNull()
      expect(data).toHaveLength(1)
    } finally {
      await deleteUser(second)
    }
  })
})

describe('data integrity', () => {
  it('deleting a category deletes its photos', async () => {
    const category = await createCategory('draft', 60)
    const { error } = await admin.client.from('categories').delete().eq('id', category.id)
    expect(error).toBeNull()
    const { count } = await service
      .from('photos')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', category.id)
    expect(count).toBe(0)
  })

  it('rejects a duplicate position within a category', async () => {
    const { error } = await admin.client
      .from('photos')
      .insert({ category_id: published.id, storage_path: `${published.id}/dup.webp`, position: 0 })
    expect(error?.code).toBe('23505')
  })

  it('editing a photo updates the category last-update time', async () => {
    const before = (
      await service.from('categories').select('updated_at').eq('id', published.id).single()
    ).data!.updated_at
    await new Promise((r) => setTimeout(r, 20))
    const { error } = await admin.client
      .from('photos')
      .update({ answer: 'Edited' })
      .eq('category_id', published.id)
      .eq('position', 1)
    expect(error).toBeNull()
    const after = (
      await service.from('categories').select('updated_at').eq('id', published.id).single()
    ).data!.updated_at
    expect(new Date(after).getTime()).toBeGreaterThan(new Date(before).getTime())
  })
})

describe('storage', () => {
  const publishedPath = () => `${published.id}/file.svg`
  const draftPath = () => `${draft.id}/file.svg`

  beforeAll(async () => {
    for (const path of [publishedPath(), draftPath()]) {
      const { error } = await admin.client.storage.from('photos').upload(path, svg(path))
      if (error) throw error
    }
  })

  it('lets anyone sign and download a photo of a published category', async () => {
    const { data, error } = await anon().storage.from('photos').createSignedUrl(publishedPath(), 60)
    expect(error).toBeNull()
    const res = await fetch(data!.signedUrl)
    expect(res.status).toBe(200)
  })

  it('refuses photos of a draft category to anonymous visitors', async () => {
    const signed = await anon().storage.from('photos').createSignedUrl(draftPath(), 60)
    expect(signed.error).not.toBeNull()
    const download = await anon().storage.from('photos').download(draftPath())
    expect(download.error).not.toBeNull()
  })

  it('lets the admin read draft photos', async () => {
    const { error } = await admin.client.storage.from('photos').createSignedUrl(draftPath(), 60)
    expect(error).toBeNull()
  })

  it('rejects uploads from anonymous visitors and non-admins', async () => {
    const a = await anon().storage.from('photos').upload(`${published.id}/anon.svg`, svg('x'))
    expect(a.error).not.toBeNull()
    const p = await plain.client.storage
      .from('photos')
      .upload(`${published.id}/plain.svg`, svg('x'))
    expect(p.error).not.toBeNull()
  })

  it('is a private bucket (no public URLs)', async () => {
    const { data } = await service.storage.getBucket('photos')
    expect(data?.public).toBe(false)
  })
})
