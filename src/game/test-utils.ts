import { createGame, gameReducer } from './reducer'
import type { GameState, Settings } from './types'

export const PHOTOS = Array.from({ length: 100 }, (_, i) => `p${i}`)

/** A game already past its countdown: player 1 is answering and their clock started at `now`. */
export function startedGame(
  now: number,
  settings: Partial<Settings> = {},
  photoIds: readonly string[] = PHOTOS,
  seed = 1,
): GameState {
  const s = createGame({ photoIds, now, seed, settings: { ...settings, countdownMs: 0 } })
  return gameReducer(s, { type: 'tick', now })
}
