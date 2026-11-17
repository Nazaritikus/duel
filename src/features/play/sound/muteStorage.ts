const KEY = 'duel.sound.v1'

const defaultStorage = (): Storage | undefined => {
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

export function loadMuted(storage: Storage | undefined = defaultStorage()): boolean {
  try {
    const value = JSON.parse(storage?.getItem(KEY) ?? 'null') as { muted?: unknown } | null
    return value?.muted === true
  } catch {
    return false
  }
}

export function saveMuted(muted: boolean, storage: Storage | undefined = defaultStorage()) {
  try {
    storage?.setItem(KEY, JSON.stringify({ muted }))
  } catch {
    // Private mode or full storage: the choice just is not remembered.
  }
}
