import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  createCategory,
  createUser,
  deleteCategory,
  deleteUser,
  service,
  type TestUser,
} from './helpers'

let admin: TestUser
const created: string[] = []

async function draftWith(photoCount: number, emptyAnswers = 0) {
  const category = await createCategory('draft', photoCount)
  created.push(category.id)
  if (emptyAnswers > 0) {
    const { error } = await service
      .from('photos')
      .update({ answer: '  ' })
      .eq('category_id', category.id)
      .lt('position', emptyAnswers)
    if (error) throw error
  }
  return category
}

async function status(id: string) {
  const { data } = await service.from('categories').select('status').eq('id', id).single()
  return data!.status
}

beforeAll(async () => {
  admin = await createUser({ admin: true })
})

afterAll(async () => {
  for (const id of created) await deleteCategory(id)
  await deleteUser(admin)
})

describe('publish rule', () => {
  it('rejects an admin publish with 59 answered photos', async () => {
    const category = await draftWith(59)
    const { error } = await admin.client
      .from('categories')
      .update({ status: 'published' })
      .eq('id', category.id)
    expect(error?.code).toBe('23514')
    expect(error?.hint).toBe('publish_rule')
    expect(await status(category.id)).toBe('draft')
  })

  it('rejects 60 photos when one answer is blank', async () => {
    const category = await draftWith(60, 1)
    const { error } = await admin.client
      .from('categories')
      .update({ status: 'published' })
      .eq('id', category.id)
    expect(error?.code).toBe('23514')
    expect(await status(category.id)).toBe('draft')
  })

  it('rejects inserting a category as published', async () => {
    const { error } = await admin.client
      .from('categories')
      .insert({ name: `Test ${crypto.randomUUID().slice(0, 8)}`, status: 'published' })
    expect(error?.code).toBe('23514')
  })

  it('publishes 60 answered photos', async () => {
    const category = await draftWith(60)
    const { error } = await admin.client
      .from('categories')
      .update({ status: 'published' })
      .eq('id', category.id)
    expect(error).toBeNull()
    expect(await status(category.id)).toBe('published')
  })

  it('lets the service role publish a small category (seed)', async () => {
    const category = await draftWith(12)
    const { error } = await service
      .from('categories')
      .update({ status: 'published' })
      .eq('id', category.id)
    expect(error).toBeNull()
    expect(await status(category.id)).toBe('published')
  })

  it('still lets an admin edit an already published category', async () => {
    const category = await createCategory('published', 3)
    created.push(category.id)
    const { error } = await admin.client
      .from('categories')
      .update({ name: 'Renamed', hint: 'x' })
      .eq('id', category.id)
    expect(error).toBeNull()
  })

  it('lets an admin unpublish', async () => {
    const category = await createCategory('published', 3)
    created.push(category.id)
    const { error } = await admin.client
      .from('categories')
      .update({ status: 'draft' })
      .eq('id', category.id)
    expect(error).toBeNull()
    expect(await status(category.id)).toBe('draft')
  })
})
