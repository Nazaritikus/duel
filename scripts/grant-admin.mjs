#!/usr/bin/env node
// Adds a user to the admin allowlist, creating the Auth user if needed (they sign in with a
// magic link later). Usage: npm run db:grant-admin -- [--remote] <email>
import { createClient } from '@supabase/supabase-js'
import { resolveTarget } from './supabase-env.mjs'

const { remote, args, env } = resolveTarget()
const email = args[0]?.trim().toLowerCase()
if (!email || !email.includes('@')) {
  console.error('Usage: npm run db:grant-admin -- [--remote] <email>')
  process.exit(1)
}

const admin = createClient(env.url, env.secretKey, { auth: { persistSession: false } })

async function findUser(address) {
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const user = data.users.find((u) => u.email?.toLowerCase() === address)
    if (user) return user
    if (data.users.length < 1000) return null
  }
}

let user = await findUser(email)
if (!user) {
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true })
  if (error) throw error
  user = data.user
  console.log(`Created Auth user ${email}`)
}

const { error } = await admin.from('admins').upsert({ user_id: user.id })
if (error) throw error
console.log(`${email} is an admin (${remote ? 'cloud' : 'local'})`)
