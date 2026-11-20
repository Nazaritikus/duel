import { useEffect, useRef } from 'react'

export type HostHotkey = 'correct' | 'wrong' | 'pass' | 'check' | 'togglePause' | 'exit'

/** Physical keys (`KeyboardEvent.code`), so letter keys work with any layout (e.g. Ukrainian). */
const KEY_MAP: Record<string, HostHotkey> = {
  ArrowRight: 'correct',
  Enter: 'correct',
  NumpadEnter: 'correct',
  KeyX: 'wrong',
  KeyP: 'pass',
  KeyQ: 'check',
  Space: 'togglePause',
  Escape: 'exit',
}

/** Input types that do not take typed text: hotkeys stay active on them. */
const NON_TEXT_INPUTS = new Set([
  'radio',
  'checkbox',
  'button',
  'submit',
  'reset',
  'range',
  'color',
  'file',
])

/** True while focus is somewhere the host types text: hotkeys must not fire there. */
function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  if (target instanceof HTMLInputElement) return !NON_TEXT_INPUTS.has(target.type)
  return target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement
}

const ACTIVATION_KEYS = new Set(['Enter', 'NumpadEnter', 'Space'])

/** Enter/Space on a focused control press that control natively, never a hotkey. */
function activatesControl(event: KeyboardEvent): boolean {
  if (!ACTIVATION_KEYS.has(event.code)) return false
  const target = event.target
  if (!(target instanceof HTMLElement)) return false
  if (target instanceof HTMLButtonElement) return true
  if (target instanceof HTMLAnchorElement) return target.hasAttribute('href')
  return (
    target instanceof HTMLInputElement && (target.type === 'radio' || target.type === 'checkbox')
  )
}

/** Maps a key event to a host hotkey, or null when it must be ignored. */
export function hotkeyFor(event: KeyboardEvent): HostHotkey | null {
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return null
  if (isEditable(event.target) || activatesControl(event)) return null
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
  if (isEditable(event.target) || activatesControl(event)) return null
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
