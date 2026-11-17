import { defineConfig } from 'vitest/config'

// RLS / storage policy tests against the local Supabase stack (`npm run db:start` first).
export default defineConfig({
  test: {
    include: ['tests/db/**/*.test.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
})
