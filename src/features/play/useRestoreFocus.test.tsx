// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useRestoreFocus } from './useRestoreFocus'

function Overlay() {
  useRestoreFocus()
  return (
    <button type="button" autoFocus>
      Закрити
    </button>
  )
}

function Page({ open, withTrigger = true }: { open: boolean; withTrigger?: boolean }) {
  return (
    <>
      {withTrigger && <button type="button">Як провести гру</button>}
      {open && <Overlay />}
    </>
  )
}

describe('useRestoreFocus', () => {
  it('returns focus to the element focused before the overlay opened', () => {
    const { rerender } = render(<Page open={false} />)
    screen.getByRole('button', { name: 'Як провести гру' }).focus()
    rerender(<Page open />)
    expect(screen.getByRole('button', { name: 'Закрити' })).toHaveFocus()
    rerender(<Page open={false} />)
    expect(screen.getByRole('button', { name: 'Як провести гру' })).toHaveFocus()
  })

  it('does nothing when that element is gone', () => {
    const { rerender } = render(<Page open={false} />)
    screen.getByRole('button', { name: 'Як провести гру' }).focus()
    rerender(<Page open />)
    expect(() => rerender(<Page open={false} withTrigger={false} />)).not.toThrow()
  })
})
