import { useCallback, useEffect, useReducer } from 'react'
import { createGame, gameReducer, type GameState, type Settings } from '../../game'

export interface FrameClock {
  now: () => number
  requestFrame: (cb: () => void) => number
  cancelFrame: (id: number) => void
}

export const browserClock: FrameClock = {
  now: () => performance.now(),
  requestFrame: (cb) => requestAnimationFrame(cb),
  cancelFrame: (id) => cancelAnimationFrame(id),
}

export type GameCommand = 'correct' | 'wrong' | 'pass' | 'check' | 'pause' | 'resume'

interface UseGameOptions {
  photoIds: readonly string[]
  seed: number
  settings?: Partial<Settings>
  clock?: FrameClock
}

/**
 * Owns the engine state and drives it with a frame loop (`tick(now)` every frame) until the game
 * finishes. Render time is `state.lastNow`, the timestamp of the latest tick or command.
 */
export function useGame({ photoIds, seed, settings, clock = browserClock }: UseGameOptions) {
  const [state, dispatch] = useReducer(gameReducer, undefined, (): GameState =>
    createGame({ photoIds, now: clock.now(), seed, settings }),
  )
  const finished = state.phase.type === 'finished'

  useEffect(() => {
    if (finished) return
    let id = 0
    const loop = () => {
      dispatch({ type: 'tick', now: clock.now() })
      id = clock.requestFrame(loop)
    }
    id = clock.requestFrame(loop)
    return () => clock.cancelFrame(id)
  }, [finished, clock])

  const command = useCallback((type: GameCommand) => dispatch({ type, now: clock.now() }), [clock])

  return { state, now: state.lastNow, command }
}
