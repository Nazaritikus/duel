/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // Engine tests run in Node; component tests opt in with `// @vitest-environment jsdom`.
    setupFiles: ['./src/test/setup.ts'],
  },
})
