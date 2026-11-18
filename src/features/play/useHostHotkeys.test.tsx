// @vitest-environment jsdom
import { fireEvent, render, renderHook, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { appHotkeyFor, hotkeyFor, useHostHotkeys } from './useHostHotkeys'

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
    fireEvent.keyDown(window, { code: 'Escape', key: 'Escape' })
    expect(onHotkey.mock.calls.map((c) => c[0])).toEqual([
      'correct',
      'correct',
      'wrong',
      'pass',
      'togglePause',
      'exit',
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

  it('does nothing and keeps default behaviour when disabled', () => {
    const onHotkey = vi.fn()
    renderHook(() => useHostHotkeys(onHotkey, false))
    const event = new KeyboardEvent('keydown', { code: 'Space', key: ' ', cancelable: true })
    window.dispatchEvent(event)
    expect(onHotkey).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  it('lets Enter and Space press a focused button or radio', () => {
    const onHotkey = setup()
    render(
      <>
        <button type="button">Продовжити</button>
        <input type="radio" aria-label="60 с" />
      </>,
    )
    const button = screen.getByRole('button')
    fireEvent.keyDown(button, { code: 'Enter', key: 'Enter' })
    fireEvent.keyDown(button, { code: 'Space', key: ' ' })
    fireEvent.keyDown(screen.getByRole('radio'), { code: 'Space', key: ' ' })
    expect(onHotkey).not.toHaveBeenCalled()
    fireEvent.keyDown(button, { code: 'KeyX', key: 'x' })
    expect(onHotkey).toHaveBeenCalledWith('wrong')
  })
})

describe('hotkeyFor / appHotkeyFor targets', () => {
  const on = (code: string, target: EventTarget) => {
    const event = new KeyboardEvent('keydown', { code })
    Object.defineProperty(event, 'target', { value: target })
    return event
  }
  const el = (html: string) => {
    const host = document.createElement('div')
    host.innerHTML = html
    return host.firstElementChild!
  }

  it('treats only text-entry fields as typing', () => {
    expect(hotkeyFor(on('KeyX', el('<input type="text">')))).toBeNull()
    expect(hotkeyFor(on('KeyX', el('<input type="search">')))).toBeNull()
    expect(hotkeyFor(on('KeyX', el('<textarea></textarea>')))).toBeNull()
    expect(hotkeyFor(on('KeyX', el('<input type="radio">')))).toBe('wrong')
    expect(appHotkeyFor(on('KeyF', el('<input type="radio">')))).toBe('fullscreen')
  })

  it('yields activation keys to buttons, links, radios and checkboxes', () => {
    expect(hotkeyFor(on('Enter', el('<button></button>')))).toBeNull()
    expect(hotkeyFor(on('NumpadEnter', el('<a href="/x">x</a>')))).toBeNull()
    expect(hotkeyFor(on('Space', el('<input type="checkbox">')))).toBeNull()
    expect(hotkeyFor(on('Enter', el('<a>x</a>')))).toBe('correct')
    expect(hotkeyFor(on('Enter', el('<div></div>')))).toBe('correct')
  })
})
