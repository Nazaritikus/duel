import type { Clock, GameState, PlayerIndex } from './types'

export function otherPlayer(player: PlayerIndex): PlayerIndex {
  return player === 0 ? 1 : 0
}

/** Time never flows backwards: timestamps earlier than the last seen one are clamped. */
export function clampNow(state: GameState, now: number): number {
  return Math.max(now, state.lastNow)
}

export function getRemainingMs(state: GameState, player: PlayerIndex, now: number): number {
  const { clock } = state
  if (clock.running === player && clock.since !== null) {
    const elapsed = clampNow(state, now) - clock.since
    return Math.max(0, clock.remainingMs[player] - elapsed)
  }
  return clock.remainingMs[player]
}

export function startClock(clock: Clock, player: PlayerIndex, at: number): Clock {
  return { remainingMs: clock.remainingMs, running: player, since: at }
}

/** Stops the running clock and commits the elapsed segment into its remaining time. */
export function stopClock(clock: Clock, at: number): Clock {
  if (clock.running === null || clock.since === null) return clock
  const remaining = [...clock.remainingMs] as [number, number]
  remaining[clock.running] = Math.max(0, remaining[clock.running] - (at - clock.since))
  return { remainingMs: remaining, running: null, since: null }
}

/** Moment the running clock reaches 0, or null when no clock runs. */
export function timeoutAt(clock: Clock): number | null {
  if (clock.running === null || clock.since === null) return null
  return clock.since + clock.remainingMs[clock.running]
}
