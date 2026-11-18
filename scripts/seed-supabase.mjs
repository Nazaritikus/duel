#!/usr/bin/env node
// Seeds Supabase from the generated mock catalog (public/mock/catalog.json): uploads every
// SVG to the private `photos` bucket and inserts published categories with their photos.
// Idempotent and non-destructive: a category with the same name is refilled by uploading
// and inserting the new photos first, then removing the old ones, so it is never empty.
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
const BATCH = 8

const must = ({ data, error }) => {
  if (error) throw error
  return data
}

async function upload(path, publicPath) {
  const body = readFileSync(join(root, 'public', publicPath))
  must(await db.storage.from('photos').upload(path, body, { contentType: 'image/svg+xml' }))
}

async function inBatches(items, task) {
  for (let i = 0; i < items.length; i += BATCH)
    await Promise.all(items.slice(i, i + BATCH).map(task))
}

async function seedCategory(mock) {
  const matches = must(await db.from('categories').select('id').eq('name', mock.name))
  if (matches.length > 1) {
    throw new Error(`Кілька категорій з назвою "${mock.name}" — видаліть дублікат`)
  }
  const categoryId =
    matches[0]?.id ??
    must(await db.from('categories').insert({ name: mock.name }).select('id').single()).id

  const old = must(
    await db
      .from('photos')
      .select('id, storage_path, answer_storage_path, position')
      .eq('category_id', categoryId),
  )
  const offset = old.reduce((max, p) => Math.max(max, p.position + 1), 0)

  // 1. Upload the new files under new photo ids; the old photos stay visible meanwhile.
  const rows = mock.photos.map((photo, i) => {
    const id = crypto.randomUUID()
    return {
      photo,
      row: {
        id,
        category_id: categoryId,
        storage_path: `${categoryId}/${id}.svg`,
        answer_storage_path: photo.answerSrc ? `${categoryId}/${id}.answer.svg` : null,
        answer: photo.answer,
        is_vertical: photo.isVertical,
        position: offset + i,
      },
    }
  })
  const uploaded = []
  try {
    await inBatches(rows, async ({ photo, row }) => {
      await upload(row.storage_path, photo.src)
      uploaded.push(row.storage_path)
      if (row.answer_storage_path) {
        await upload(row.answer_storage_path, photo.answerSrc)
        uploaded.push(row.answer_storage_path)
      }
    })
    // 2. Insert the new rows after the old ones in one statement.
    must(await db.from('photos').insert(rows.map((r) => r.row)))
  } catch (error) {
    if (uploaded.length) await db.storage.from('photos').remove(uploaded) // best effort
    throw error
  }

  // 3. Only now remove the old rows, then their files.
  if (old.length) {
    must(
      await db
        .from('photos')
        .delete()
        .in(
          'id',
          old.map((p) => p.id),
        ),
    )
    const oldFiles = old.flatMap((p) => [p.storage_path, p.answer_storage_path]).filter(Boolean)
    must(await db.storage.from('photos').remove(oldFiles))
  }
  must(await db.from('categories').update({ status: 'published' }).eq('id', categoryId))
  console.log(`${mock.name}: ${rows.length} photos (replaced ${old.length})`)
}

for (const mock of catalog) await seedCategory(mock)
console.log(`Seeded ${catalog.length} categories (${remote ? 'cloud' : 'local'})`)
