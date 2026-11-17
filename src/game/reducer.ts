import { clampNow, otherPlayer, startClock, stopClock, timeoutAt } from './clock'
import { DEFAULT_SETTINGS, type Action, type GameState, type Settings } from './types'

export function createGame(
  photoIds: readonly string[],
  now: number,
  settings: Settings = DEFAULT_SETTINGS,
): GameState {
  const t = settings.timePerPlayerMs
  return {
    settings,
    photoIds,
    photoIndex: 0,
    clock: { remainingMs: [t, t], running: 0, since: now },
    phase: { type: 'turn', player: 0 },
    lastNow: now,
  }
}

export function getCurrentPhotoId(state: GameState): string | undefined {
  return state.photoIds[state.photoIndex]
}

/**
 * Applies every time-driven transition up to `now`, in chronological order:
 * a clock reaching 0 finishes the game; a feedback phase ending starts the next turn.
 * Returns the same object when nothing happened.
 */
function resolveTime(state: GameState, now: number): GameState {
  let s = state
  for (;;) {
    if (s.phase.type === 'finished') return s

    const tAt = timeoutAt(s.clock)
    const feedbackEnd = s.phase.type === 'feedback' ? s.phase.endsAt : null

    const timedOut = tAt !== null && tAt <= now && (feedbackEnd === null || tAt <= feedbackEnd)
    if (timedOut && s.clock.running !== null) {
      const loser = s.clock.running
      s = {
        ...s,
        clock: stopClock(s.clock, tAt),
        phase: { type: 'finished', winner: otherPlayer(loser), reason: 'timeout', at: tAt },
      }
      continue
    }

    if (s.phase.type === 'feedback' && feedbackEnd !== null && feedbackEnd <= now) {
      const { kind, player } = s.phase
      if (kind === 'correct') {
        const next = otherPlayer(player)
        s = {
          ...s,
          photoIndex: s.photoIndex + 1,
          clock: startClock(s.clock, next, feedbackEnd),
          phase: { type: 'turn', player: next },
        }
      } else {
        s = { ...s, photoIndex: s.photoIndex + 1, phase: { type: 'turn', player } }
      }
      continue
    }

    return s
  }
}

export function gameReducer(state: GameState, action: Action): GameState {
  const now = clampNow(state, action.now)
  const resolved = resolveTime(state, now)

  if (action.type === 'tick') {
    if (resolved === state && now === state.lastNow) return state
    return { ...resolved, lastNow: now }
  }

  // Host input only counts while a player is answering.
  if (resolved.phase.type !== 'turn') return resolved

  const { player } = resolved.phase
  if (action.type === 'correct') {
    return {
      ...resolved,
      clock: stopClock(resolved.clock, now),
      phase: {
        type: 'feedback',
        kind: 'correct',
        player,
        endsAt: now + resolved.settings.correctFeedbackMs,
      },
      lastNow: now,
    }
  }

  return {
    ...resolved,
    phase: {
      type: 'feedback',
      kind: action.type,
      player,
      endsAt: now + resolved.settings.penaltyMs,
    },
    lastNow: now,
  }
}
