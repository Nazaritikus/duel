import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  createCategory,
  createUser,
  deleteCategory,
  deleteUser,
  service,
  svg,
  webp,
  type TestUser,
} from './helpers'

let admin: TestUser
let a: { id: string }
let b: { id: string }

beforeAll(async () => {
  admin = await createUser({ admin: true })
  a = await createCategory('draft')
  b = await createCategory('draft')
})

afterAll(async () => {
  for (const c of [a, b]) if (c) await deleteCategory(c.id)
  await deleteUser(admin)
})

const updatedAt = async (id: string) =>
  new Date(
    (await service.from('categories').select('updated_at').eq('id', id).single()).data!.updated_at,
  ).getTime()

describe('photo path check', () => {
  it('rejects a photo whose file is in another category folder', async () => {
    const { error } = await admin.client
      .from('photos')
      .insert({ category_id: a.id, storage_path: `${b.id}/x.webp`, position: 0 })
    expect(error?.code).toBe('23514')
  })

  it('rejects an answer photo in another category folder', async () => {
    const { error } = await admin.client.from('photos').insert({
      category_id: a.id,
      storage_path: `${a.id}/x.webp`,
      answer_storage_path: `${b.id}/x.answer.webp`,
      position: 0,
    })
    expect(error?.code).toBe('23514')
  })

  it('accepts paths inside the category folder', async () => {
    const { error } = await admin.client.from('photos').insert({
      category_id: a.id,
      storage_path: `${a.id}/ok.webp`,
      answer_storage_path: `${a.id}/ok.answer.webp`,
      position: 0,
    })
    expect(error).toBeNull()
  })
})

describe('admin uploads', () => {
  it('rejects an SVG file', async () => {
    const { error } = await admin.client.storage.from('photos').upload(`${a.id}/x.svg`, svg('x'))
    expect(error).not.toBeNull()
  })

  it('rejects SVG content sent under a raster extension', async () => {
    const { error } = await admin.client.storage
      .from('photos')
      .upload(`${a.id}/disguised.webp`, svg('x'))
    expect(error).not.toBeNull()
  })

  it('still accepts WebP and lets the admin replace it', async () => {
    const path = `${a.id}/real.webp`
    const first = await admin.client.storage.from('photos').upload(path, webp('1'))
    expect(first.error).toBeNull()
    const again = await admin.client.storage
      .from('photos')
      .upload(path, webp('2'), { upsert: true })
    expect(again.error).toBeNull()
  })

  it('still lets the secret key upload SVG (mock seed)', async () => {
    const { error } = await service.storage.from('photos').upload(`${b.id}/seed.svg`, svg('x'))
    expect(error).toBeNull()
  })
})

describe('statement-level touch', () => {
  it('a 60-row insert moves the category last-update time', async () => {
    const c = await createCategory('draft')
    try {
      const before = await updatedAt(c.id)
      await new Promise((r) => setTimeout(r, 20))
      const rows = Array.from({ length: 60 }, (_, position) => ({
        category_id: c.id,
        storage_path: `${c.id}/${crypto.randomUUID()}.webp`,
        answer: `A ${position}`,
        position,
      }))
      const { error } = await admin.client.from('photos').insert(rows)
      expect(error).toBeNull()
      expect(await updatedAt(c.id)).toBeGreaterThan(before)
    } finally {
      await deleteCategory(c.id)
    }
  })

  it('a delete moves the category last-update time', async () => {
    const c = await createCategory('draft', 3)
    try {
      const before = await updatedAt(c.id)
      await new Promise((r) => setTimeout(r, 20))
      const { error } = await admin.client.from('photos').delete().eq('category_id', c.id)
      expect(error).toBeNull()
      expect(await updatedAt(c.id)).toBeGreaterThan(before)
    } finally {
      await deleteCategory(c.id)
    }
  })
})
