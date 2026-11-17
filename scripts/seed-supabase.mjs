#!/usr/bin/env node
// Seeds Supabase from the generated mock catalog (public/mock/catalog.json): uploads every
// SVG to the private `photos` bucket and inserts published categories with their photos.
// Idempotent: a category with the same name is emptied and refilled.
// Usage: npm run db:seed [-- --remote]
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveTarget } from './supabase-env.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const { remote, env } = resolveTarget()
const db = createClient(env.url, env.secretKey, { auth: { persistSession: false } })
const catalog = JSON.parse(readFileSync(join(root, 'public/mock/catalog.json'), 'utf8'))

const must = ({ data, error }) => {
  if (error) throw error
  return data
}

async function removeFolder(categoryId) {
  const files = must(await db.storage.from('photos').list(categoryId, { limit: 1000 }))
  if (files.length) {
    must(await db.storage.from('photos').remove(files.map((f) => `${categoryId}/${f.name}`)))
  }
}

async function upload(path, publicPath) {
  const body = readFileSync(join(root, 'public', publicPath))
  must(
    await db.storage
      .from('photos')
      .upload(path, body, { contentType: 'image/svg+xml', upsert: true }),
  )
}

for (const mock of catalog) {
  const existing = must(await db.from('categories').select('id').eq('name', mock.name))
  let categoryId = existing[0]?.id
  if (categoryId) {
    must(await db.from('photos').delete().eq('category_id', categoryId))
    await removeFolder(categoryId)
  } else {
    categoryId = must(
      await db.from('categories').insert({ name: mock.name }).select('id').single(),
    ).id
  }

  const rows = []
  for (const [position, photo] of mock.photos.entries()) {
    const id = crypto.randomUUID()
    const storagePath = `${categoryId}/${id}.svg`
    const answerPath = photo.answerSrc ? `${categoryId}/${id}.answer.svg` : null
    await upload(storagePath, photo.src)
    if (answerPath) await upload(answerPath, photo.answerSrc)
    rows.push({
      id,
      category_id: categoryId,
      storage_path: storagePath,
      answer_storage_path: answerPath,
      answer: photo.answer,
      is_vertical: photo.isVertical,
      position,
    })
  }
  must(await db.from('photos').insert(rows))
  must(await db.from('categories').update({ status: 'published' }).eq('id', categoryId))
  console.log(`${mock.name}: ${rows.length} photos`)
}
console.log(`Seeded ${catalog.length} categories (${remote ? 'cloud' : 'local'})`)
