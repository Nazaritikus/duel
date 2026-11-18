#!/usr/bin/env node
// Lists files in the `photos` bucket that no photo row references any more: a folder whose
// category is gone, or a file whose photo row is gone. Deletes them only with --apply.
// Usage: npm run db:storage-orphans [-- --remote] [--apply]
import { createClient } from '@supabase/supabase-js'
import { resolveTarget } from './supabase-env.mjs'

const { remote, args, env } = resolveTarget()
const apply = args.includes('--apply')
const db = createClient(env.url, env.secretKey, { auth: { persistSession: false } })
const PAGE = 1000

const must = ({ data, error }) => {
  if (error) throw error
  return data
}

async function listAll(prefix) {
  const items = []
  for (let offset = 0; ; offset += PAGE) {
    const page = must(
      await db.storage
        .from('photos')
        .list(prefix, { limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' } }),
    )
    items.push(...page)
    if (page.length < PAGE) return items
  }
}

async function allRows(table, columns) {
  const rows = []
  for (let from = 0; ; from += PAGE) {
    const page = must(
      await db
        .from(table)
        .select(columns)
        .range(from, from + PAGE - 1),
    )
    rows.push(...page)
    if (page.length < PAGE) return rows
  }
}

const categories = new Set((await allRows('categories', 'id')).map((c) => c.id))
const referenced = new Set(
  (await allRows('photos', 'storage_path, answer_storage_path'))
    .flatMap((p) => [p.storage_path, p.answer_storage_path])
    .filter(Boolean),
)

const orphans = []
// Top-level entries are category folders (folders have no id in the listing).
for (const folder of await listAll('')) {
  if (folder.id !== null) {
    orphans.push({ path: folder.name, reason: 'file outside a category folder' })
    continue
  }
  const known = categories.has(folder.name)
  for (const file of await listAll(folder.name)) {
    const path = `${folder.name}/${file.name}`
    if (!known) orphans.push({ path, reason: 'category deleted' })
    else if (!referenced.has(path)) orphans.push({ path, reason: 'no photo row' })
  }
}

const target = remote ? 'cloud' : 'local'
if (!orphans.length) {
  console.log(`No orphaned files (${target}).`)
} else {
  for (const o of orphans) console.log(`${o.path}  — ${o.reason}`)
  if (apply) {
    for (let i = 0; i < orphans.length; i += PAGE) {
      must(await db.storage.from('photos').remove(orphans.slice(i, i + PAGE).map((o) => o.path)))
    }
    console.log(`Deleted ${orphans.length} orphaned files (${target}).`)
  } else {
    console.log(
      `${orphans.length} orphaned files (${target}). Dry run: re-run with --apply to delete them.`,
    )
  }
}
