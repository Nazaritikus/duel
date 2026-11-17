import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // Engine tests run in Node; component tests opt in with `// @vitest-environment jsdom`.
    setupFiles: ['./src/test/setup.ts'],
    // Unit tests never talk to a real Supabase: without these the app falls back to the mock
    // catalog and the admin explains the missing config.
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: '' },
    // DB policy tests need the local Supabase stack; run them with `npm run test:db`.
    exclude: [...configDefaults.exclude, 'tests/db/**'],
  },
})
