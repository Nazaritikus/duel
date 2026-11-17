import { useEffect, useRef } from 'react'

export type HostHotkey = 'correct' | 'wrong' | 'pass' | 'togglePause'

/** Physical keys (`KeyboardEvent.code`), so letter keys work with any layout (e.g. Ukrainian). */
const KEY_MAP: Record<string, HostHotkey> = {
  ArrowRight: 'correct',
  Enter: 'correct',
  NumpadEnter: 'correct',
  KeyX: 'wrong',
  KeyP: 'pass',
  Space: 'togglePause',
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

/** Maps a key event to a host hotkey, or null when it must be ignored. */
export function hotkeyFor(event: KeyboardEvent): HostHotkey | null {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return null
  if (isEditable(event.target)) return null
  return KEY_MAP[event.code] ?? null
}

/** Listens for host hotkeys on the window; the latest handler is always used. */
export function useHostHotkeys(onHotkey: (hotkey: HostHotkey) => void) {
  const handler = useRef(onHotkey)
  useEffect(() => {
    handler.current = onHotkey
  })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const hotkey = hotkeyFor(event)
      if (!hotkey) return
      event.preventDefault()
      handler.current(hotkey)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
