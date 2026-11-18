import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'

// Vitest globals are off, so Testing Library cannot register its auto-cleanup itself.
afterEach(async () => {
  if (typeof document === 'undefined') return
  const { cleanup } = await import('@testing-library/react')
  cleanup()
})

// jsdom has no modal <dialog>: open/close and the `close` event are enough for the tests.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement, value?: string) {
    if (!this.open) return
    this.open = false
    if (value !== undefined) this.returnValue = value
    this.dispatchEvent(new Event('close'))
  }
}
