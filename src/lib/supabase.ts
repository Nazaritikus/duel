import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

export type TypedSupabaseClient = SupabaseClient<Database>

let client: TypedSupabaseClient | null = null

/**
 * The browser Supabase client, created on first use so the app (and tests) run without env
 * vars while the game still uses the mock catalog. Uses only the publishable key; RLS
 * protects the data.
 */
export function getSupabase(
  env: Record<string, string | undefined> = import.meta.env,
): TypedSupabaseClient {
  if (client) return client
  const url = env.VITE_SUPABASE_URL
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (!url || !publishableKey) {
    throw new Error(
      'Supabase is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env (see docs/setup.md)',
    )
  }
  client = createClient<Database>(url, publishableKey)
  return client
}

/** Test-only: forget the cached client. */
export function resetSupabaseForTests() {
  client = null
}
