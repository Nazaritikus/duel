// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog'

function Harness({ onConfirm = () => {}, onCancel = () => {} }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Видалити фото
      </button>
      {open && (
        <ConfirmDialog
          title="Видалити фото?"
          confirmLabel="Видалити"
          danger
          onConfirm={() => {
            setOpen(false)
            onConfirm()
          }}
          onCancel={() => {
            setOpen(false)
            onCancel()
          }}
        >
          Файли буде видалено назавжди.
        </ConfirmDialog>
      )}
    </>
  )
}

function open(props: Parameters<typeof Harness>[0] = {}) {
  render(<Harness {...props} />)
  const trigger = screen.getByRole('button', { name: 'Видалити фото' })
  trigger.focus()
  fireEvent.click(trigger)
  return trigger
}

describe('ConfirmDialog', () => {
  it('opens as a modal with focus on «Скасувати»', () => {
    open()
    const dialog = screen.getByRole('dialog', { name: 'Видалити фото?' })
    expect(dialog).toHaveAttribute('open')
    expect(dialog).toHaveTextContent('Файли буде видалено назавжди.')
    expect(screen.getByRole('button', { name: 'Скасувати' })).toHaveFocus()
  })

  it('confirms with «Видалити»', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    open({ onConfirm, onCancel })
    fireEvent.click(screen.getByRole('button', { name: 'Видалити' }))
    expect(onConfirm).toHaveBeenCalledOnce()
    expect(onCancel).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('cancels with «Скасувати» and returns focus to the trigger', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const trigger = open({ onConfirm, onCancel })
    fireEvent.click(screen.getByRole('button', { name: 'Скасувати' }))
    expect(onCancel).toHaveBeenCalledOnce()
    expect(onConfirm).not.toHaveBeenCalled()
    expect(trigger).toHaveFocus()
  })

  it('cancels on Esc', () => {
    const onCancel = vi.fn()
    const trigger = open({ onCancel })
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))
    expect(onCancel).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})
