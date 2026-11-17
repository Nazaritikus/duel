// @vitest-environment jsdom
import { fireEvent, render, renderHook, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useHostHotkeys } from './useHostHotkeys'

function setup() {
  const onHotkey = vi.fn()
  renderHook(() => useHostHotkeys(onHotkey))
  return onHotkey
}

describe('useHostHotkeys', () => {
  it('maps physical keys to host actions', () => {
    const onHotkey = setup()
    fireEvent.keyDown(window, { code: 'ArrowRight', key: 'ArrowRight' })
    fireEvent.keyDown(window, { code: 'Enter', key: 'Enter' })
    fireEvent.keyDown(window, { code: 'KeyX', key: 'x' })
    fireEvent.keyDown(window, { code: 'KeyP', key: 'p' })
    fireEvent.keyDown(window, { code: 'Space', key: ' ' })
    expect(onHotkey.mock.calls.map((c) => c[0])).toEqual([
      'correct',
      'correct',
      'wrong',
      'pass',
      'togglePause',
    ])
  })

  it('works with the Ukrainian layout (KeyX types "ч")', () => {
    const onHotkey = setup()
    fireEvent.keyDown(window, { code: 'KeyX', key: 'ч' })
    fireEvent.keyDown(window, { code: 'KeyP', key: 'з' })
    expect(onHotkey.mock.calls.map((c) => c[0])).toEqual(['wrong', 'pass'])
  })

  it('ignores a held key (auto-repeat)', () => {
    const onHotkey = setup()
    fireEvent.keyDown(window, { code: 'Space', key: ' ' })
    fireEvent.keyDown(window, { code: 'Space', key: ' ', repeat: true })
    fireEvent.keyDown(window, { code: 'Space', key: ' ', repeat: true })
    expect(onHotkey).toHaveBeenCalledTimes(1)
  })

  it('ignores keys while typing in an input', () => {
    const onHotkey = setup()
    render(<input aria-label="Імʼя гравця" />)
    const input = screen.getByLabelText('Імʼя гравця')
    input.focus()
    fireEvent.keyDown(input, { code: 'KeyX', key: 'x' })
    expect(onHotkey).not.toHaveBeenCalled()
  })

  it('ignores keys with modifiers and unmapped keys', () => {
    const onHotkey = setup()
    fireEvent.keyDown(window, { code: 'KeyX', key: 'x', metaKey: true })
    fireEvent.keyDown(window, { code: 'KeyA', key: 'a' })
    expect(onHotkey).not.toHaveBeenCalled()
  })

  it('prevents the default page scroll on Space', () => {
    setup()
    const event = new KeyboardEvent('keydown', { code: 'Space', key: ' ', cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
  })
})
