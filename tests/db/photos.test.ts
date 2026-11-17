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
let categoryId: string

const webp = (label: string) => new Blob([label], { type: 'image/webp' })

beforeAll(async () => {
  admin = await createUser({ admin: true })
  categoryId = (await createCategory('draft')).id
})

afterAll(async () => {
  await deleteCategory(categoryId)
  await deleteUser(admin)
})

describe('admin photo workflow (storage + rows)', () => {
  it('uploads, replaces the answer photo with upsert and deletes everything', async () => {
    const id = crypto.randomUUID()
    const path = `${categoryId}/${id}.webp`
    const answerPath = `${categoryId}/${id}.answer.webp`
    const bucket = admin.client.storage.from('photos')

    expect((await bucket.upload(path, webp('q'), { contentType: 'image/webp' })).error).toBeNull()
    expect(
      (await bucket.upload(answerPath, webp('a1'), { contentType: 'image/webp' })).error,
    ).toBeNull()
    const insert = await admin.client.from('photos').insert({
      id,
      category_id: categoryId,
      storage_path: path,
      answer_storage_path: answerPath,
      answer: 'Fiat 500',
      is_vertical: true,
      position: 0,
    })
    expect(insert.error).toBeNull()

    const replaced = await bucket.upload(answerPath, webp('a2-longer'), {
      contentType: 'image/webp',
      upsert: true,
    })
    expect(replaced.error).toBeNull()
    const { data: blob } = await bucket.download(answerPath)
    expect(await blob!.text()).toBe('a2-longer')

    const signed = await bucket.createSignedUrls([path, answerPath], 60)
    expect(signed.error).toBeNull()
    expect(signed.data!.every((d) => d.signedUrl)).toBe(true)

    expect((await bucket.remove([path, answerPath])).error).toBeNull()
    expect((await admin.client.from('photos').delete().eq('id', id)).error).toBeNull()

    const { data: files } = await service.storage.from('photos').list(categoryId)
    expect(files).toEqual([])
    const { count } = await service
      .from('photos')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', categoryId)
    expect(count).toBe(0)
  })
})
