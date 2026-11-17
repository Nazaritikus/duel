import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // Engine tests run in Node; component tests opt in with `// @vitest-environment jsdom`.
    setupFiles: ['./src/test/setup.ts'],
    // DB policy tests need the local Supabase stack; run them with `npm run test:db`.
    exclude: [...configDefaults.exclude, 'tests/db/**'],
  },
})
