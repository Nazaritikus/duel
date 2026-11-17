import { useEffect, useRef } from 'react'

export type HostHotkey = 'correct' | 'wrong' | 'pass' | 'togglePause' | 'exit'

/** Physical keys (`KeyboardEvent.code`), so letter keys work with any layout (e.g. Ukrainian). */
const KEY_MAP: Record<string, HostHotkey> = {
  ArrowRight: 'correct',
  Enter: 'correct',
  NumpadEnter: 'correct',
  KeyX: 'wrong',
  KeyP: 'pass',
  Space: 'togglePause',
  Escape: 'exit',
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

/**
 * Listens for host hotkeys on the window; the latest handler is always used. When disabled
 * (e.g. on the setup screen) no listener is attached, so keys keep their default behaviour.
 */
export function useHostHotkeys(onHotkey: (hotkey: HostHotkey) => void, enabled = true) {
  const handler = useRef(onHotkey)
  useEffect(() => {
    handler.current = onHotkey
  })

  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (event: KeyboardEvent) => {
      const hotkey = hotkeyFor(event)
      if (!hotkey) return
      event.preventDefault()
      handler.current(hotkey)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}

export type AppHotkey = 'fullscreen' | 'mute'

const APP_KEY_MAP: Record<string, AppHotkey> = { KeyF: 'fullscreen', KeyM: 'mute' }

/** `F` / `M` work on every screen; same guards as the game keys (never while typing). */
export function appHotkeyFor(event: KeyboardEvent): AppHotkey | null {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return null
  if (isEditable(event.target)) return null
  return APP_KEY_MAP[event.code] ?? null
}

export function useAppHotkeys(onHotkey: (hotkey: AppHotkey) => void) {
  const handler = useRef(onHotkey)
  useEffect(() => {
    handler.current = onHotkey
  })
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const hotkey = appHotkeyFor(event)
      if (!hotkey) return
      event.preventDefault()
      handler.current(hotkey)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
