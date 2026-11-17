import { createMockCategorySource } from './mockCategorySource'
import { createSupabaseCategorySource } from './supabaseCategorySource'
import type { CategorySource } from './types'

export type CategorySourceKind = 'mock' | 'supabase'

/**
 * Which catalog the game plays: Supabase when configured, the generated mock catalog when
 * `VITE_CATEGORY_SOURCE=mock` or the Supabase env vars are missing (tests, offline dev).
 */
export function categorySourceKind(
  env: Record<string, string | undefined> = import.meta.env,
): CategorySourceKind {
  if (env.VITE_CATEGORY_SOURCE === 'mock') return 'mock'
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_PUBLISHABLE_KEY) return 'mock'
  return 'supabase'
}

export function createCategorySource(
  env: Record<string, string | undefined> = import.meta.env,
): CategorySource {
  return categorySourceKind(env) === 'mock'
    ? createMockCategorySource()
    : createSupabaseCategorySource()
}
