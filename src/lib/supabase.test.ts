import { afterEach, describe, expect, it } from 'vitest'
import { getSupabase, resetSupabaseForTests } from './supabase'

afterEach(() => resetSupabaseForTests())

describe('getSupabase', () => {
  it('does not throw on import and explains missing env', () => {
    expect(() => getSupabase({})).toThrow(/VITE_SUPABASE_PUBLISHABLE_KEY/)
  })

  it('creates the client once', () => {
    const env = {
      VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
    }
    const a = getSupabase(env)
    expect(getSupabase(env)).toBe(a)
  })
})
