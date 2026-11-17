import { describe, expect, it } from 'vitest'
import { categorySourceKind } from './categorySource'

const configured = {
  VITE_SUPABASE_URL: 'https://x.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'k',
}

describe('categorySourceKind', () => {
  it('uses Supabase when configured', () => {
    expect(categorySourceKind(configured)).toBe('supabase')
  })

  it('uses the mock catalog when asked to', () => {
    expect(categorySourceKind({ ...configured, VITE_CATEGORY_SOURCE: 'mock' })).toBe('mock')
  })

  it('falls back to the mock catalog without Supabase settings', () => {
    expect(categorySourceKind({})).toBe('mock')
    expect(categorySourceKind({ VITE_SUPABASE_URL: 'https://x.supabase.co' })).toBe('mock')
  })
})
