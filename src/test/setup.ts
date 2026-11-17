import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'

// Vitest globals are off, so Testing Library cannot register its auto-cleanup itself.
afterEach(async () => {
  if (typeof document === 'undefined') return
  const { cleanup } = await import('@testing-library/react')
  cleanup()
})
