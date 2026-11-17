import type { PlayerIndex } from '../../game'

export interface GameSetup {
  names: [string, string]
  categoryId: string | null
  timePerPlayerMs: number
  penaltyMs: number
  firstPlayer: PlayerIndex | 'random'
}

export const TIME_OPTIONS_MS = [45_000, 60_000, 90_000] as const
export const PENALTY_OPTIONS_MS = [3_000, 5_000] as const
export const NAME_MAX_LENGTH = 20
export const STORAGE_KEY = 'duel.setup.v1'

export const DEFAULT_SETUP: GameSetup = {
  names: ['', ''],
  categoryId: null,
  timePerPlayerMs: 60_000,
  penaltyMs: 3_000,
  firstPlayer: 0,
}

function pickName(value: unknown): string {
  return typeof value === 'string' ? value.slice(0, NAME_MAX_LENGTH) : ''
}

/** Validates stored data field by field; anything unknown falls back to the default. */
export function parseSetup(value: unknown): GameSetup {
  if (typeof value !== 'object' || value === null) return DEFAULT_SETUP
  const v = value as Record<string, unknown>
  const names = Array.isArray(v.names) ? v.names : []
  return {
    names: [pickName(names[0]), pickName(names[1])],
    categoryId: typeof v.categoryId === 'string' ? v.categoryId : null,
    timePerPlayerMs: (TIME_OPTIONS_MS as readonly unknown[]).includes(v.timePerPlayerMs)
      ? (v.timePerPlayerMs as number)
      : DEFAULT_SETUP.timePerPlayerMs,
    penaltyMs: (PENALTY_OPTIONS_MS as readonly unknown[]).includes(v.penaltyMs)
      ? (v.penaltyMs as number)
      : DEFAULT_SETUP.penaltyMs,
    firstPlayer:
      v.firstPlayer === 0 || v.firstPlayer === 1 || v.firstPlayer === 'random'
        ? v.firstPlayer
        : DEFAULT_SETUP.firstPlayer,
  }
}

export function loadSetup(storage: Storage | undefined = globalThis.localStorage): GameSetup {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    return raw ? parseSetup(JSON.parse(raw)) : DEFAULT_SETUP
  } catch {
    return DEFAULT_SETUP
  }
}

export function saveSetup(
  setup: GameSetup,
  storage: Storage | undefined = globalThis.localStorage,
): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(setup))
  } catch {
    // Private mode or blocked storage: the setup just is not remembered.
  }
}

/** Names as shown in the game: empty names fall back to "Гравець 1" / "Гравець 2". */
export function displayNames(setup: GameSetup): readonly [string, string] {
  return [setup.names[0].trim() || 'Гравець 1', setup.names[1].trim() || 'Гравець 2']
}
