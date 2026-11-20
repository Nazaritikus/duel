import { clampNow, otherPlayer, startClock, stopClock, timeoutAt } from './clock'
import { createRng, shuffle } from './shuffle'
import {
  DEFAULT_SETTINGS,
  type Action,
  type CreateGameOptions,
  type FeedbackPhase,
  type GameState,
  type HostActionType,
  type PlayerIndex,
  type PlayerStats,
} from './types'

const EMPTY_STATS: PlayerStats = { correct: 0, wrong: 0, pass: 0 }

export function createGame({ photoIds, now, seed, settings }: CreateGameOptions): GameState {
  if (photoIds.length === 0) throw new Error('createGame: photoIds must not be empty')

  const s = { ...DEFAULT_SETTINGS, ...settings }
  const rng = createRng(seed)
  // Draw order matters for reproducibility: shuffle first, then the starter.
  const shuffled = shuffle(photoIds, rng)
  const starter: PlayerIndex = s.firstPlayer === 'random' ? (rng() < 0.5 ? 0 : 1) : s.firstPlayer
  const t = s.timePerPlayerMs

  return {
    settings: s,
    photoIds: shuffled,
    photoIndex: 0,
    clock: { remainingMs: [t, t], running: null, since: null },
    phase: { type: 'countdown', starter, endsAt: now + s.countdownMs },
    stats: [EMPTY_STATS, EMPTY_STATS],
    lastNow: now,
  }
}

export function getCurrentPhotoId(state: GameState): string | undefined {
  return state.photoIds[state.photoIndex]
}

/** Whole seconds left in the countdown (3 → 2 → 1), or null outside the countdown. */
export function getCountdownSeconds(state: GameState, now: number): number | null {
  if (state.phase.type !== 'countdown') return null
  return Math.max(0, Math.ceil((state.phase.endsAt - clampNow(state, now)) / 1000))
}

/** Remaining times are compared truncated to tenths; equal means a draw. */
function winnerByTime(remainingMs: readonly [number, number]): PlayerIndex | null {
  const a = Math.floor(remainingMs[0] / 100)
  const b = Math.floor(remainingMs[1] / 100)
  if (a === b) return null
  return a > b ? 0 : 1
}

function endFeedback(s: GameState, phase: FeedbackPhase): GameState {
  const at = phase.endsAt
  if (s.photoIndex + 1 >= s.photoIds.length) {
    const clock = stopClock(s.clock, at)
    return {
      ...s,
      clock,
      phase: {
        type: 'finished',
        winner: winnerByTime(clock.remainingMs),
        reason: 'photos_exhausted',
        at,
      },
    }
  }
  if (phase.kind === 'correct') {
    const next = otherPlayer(phase.player)
    return {
      ...s,
      photoIndex: s.photoIndex + 1,
      clock: startClock(s.clock, next, at),
      phase: { type: 'turn', player: next },
    }
  }
  // Wrong / pass: the player's clock never stopped.
  return { ...s, photoIndex: s.photoIndex + 1, phase: { type: 'turn', player: phase.player } }
}

/**
 * Applies every time-driven transition up to `now`, in chronological order:
 * a clock reaching 0 finishes the game; a countdown or feedback phase ending starts the next turn
 * (or finishes the game when photos run out). Returns the same object when nothing happened.
 */
function resolveTime(state: GameState, now: number): GameState {
  let s = state
  for (;;) {
    const { phase } = s
    if (phase.type === 'finished' || phase.type === 'paused') return s

    const tAt = timeoutAt(s.clock)
    const phaseEnd = 'endsAt' in phase ? phase.endsAt : null

    const timedOut = tAt !== null && tAt <= now && (phaseEnd === null || tAt <= phaseEnd)
    if (timedOut && s.clock.running !== null) {
      const loser = s.clock.running
      s = {
        ...s,
        clock: stopClock(s.clock, tAt),
        phase: { type: 'finished', winner: otherPlayer(loser), reason: 'timeout', at: tAt },
      }
      continue
    }

    if (phaseEnd !== null && phaseEnd <= now) {
      if (phase.type === 'countdown') {
        s = {
          ...s,
          clock: startClock(s.clock, phase.starter, phaseEnd),
          phase: { type: 'turn', player: phase.starter },
        }
      } else if (phase.type === 'feedback') {
        s = endFeedback(s, phase)
      }
      continue
    }

    return s
  }
}

function withStat(
  stats: GameState['stats'],
  player: PlayerIndex,
  kind: HostActionType,
): GameState['stats'] {
  const updated = { ...stats[player], [kind]: stats[player][kind] + 1 }
  return player === 0 ? [updated, stats[1]] : [stats[0], updated]
}

function pause(s: GameState, now: number): GameState {
  const { phase } = s
  if (phase.type === 'finished' || phase.type === 'paused') return s
  return {
    ...s,
    clock: stopClock(s.clock, now),
    phase: { type: 'paused', resume: phase, runningPlayer: s.clock.running, pausedAt: now },
    lastNow: now,
  }
}

function resume(s: GameState, now: number): GameState {
  const { phase } = s
  if (phase.type !== 'paused') return s
  const shift = now - phase.pausedAt
  const prev = phase.resume
  const resumed = 'endsAt' in prev ? { ...prev, endsAt: prev.endsAt + shift } : prev
  return {
    ...s,
    clock: phase.runningPlayer === null ? s.clock : startClock(s.clock, phase.runningPlayer, now),
    phase: resumed,
    lastNow: now,
  }
}

export function gameReducer(state: GameState, action: Action): GameState {
  const now = clampNow(state, action.now)
  const resolved = resolveTime(state, now)
  // Ignored actions return the original object when time did not change anything.
  const unchanged = () => (resolved === state ? state : { ...resolved, lastNow: now })

  switch (action.type) {
    case 'tick':
      if (resolved === state && now === state.lastNow) return state
      return { ...resolved, lastNow: now }
    case 'pause': {
      const next = pause(resolved, now)
      return next === resolved ? unchanged() : next
    }
    case 'resume': {
      const next = resume(resolved, now)
      return next === resolved ? unchanged() : next
    }
    case 'check': {
      // Only a running turn can be checked; there is no way back to it afterwards.
      if (resolved.phase.type !== 'turn') return unchanged()
      return {
        ...resolved,
        clock: stopClock(resolved.clock, now),
        phase: { type: 'checking', player: resolved.phase.player },
        lastNow: now,
      }
    }
  }

  // Host judgements only count while a player is answering or the answer is being checked.
  if (resolved.phase.type !== 'turn' && resolved.phase.type !== 'checking') return unchanged()

  const { player } = resolved.phase
  const stats = withStat(resolved.stats, player, action.type)

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
      stats,
      lastNow: now,
    }
  }

  // Wrong / pass: the penalty runs on the player's clock (restarted if a check stopped it).
  return {
    ...resolved,
    clock:
      resolved.phase.type === 'checking' ? startClock(resolved.clock, player, now) : resolved.clock,
    phase: {
      type: 'feedback',
      kind: action.type,
      player,
      endsAt: now + resolved.settings.penaltyMs,
    },
    stats,
    lastNow: now,
  }
}
