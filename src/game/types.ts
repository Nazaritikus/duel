export type PlayerIndex = 0 | 1

export interface Settings {
  /** Starting time on each player's clock. */
  timePerPlayerMs: number
  /** How long the correct answer is shown; both clocks are stopped. */
  correctFeedbackMs: number
  /** How long the correct answer is shown after a wrong answer or pass; the player's clock keeps running. */
  penaltyMs: number
}

export const DEFAULT_SETTINGS: Settings = {
  timePerPlayerMs: 60_000,
  correctFeedbackMs: 2_000,
  penaltyMs: 3_000,
}

export type FeedbackKind = 'correct' | 'wrong' | 'pass'

export type FinishReason = 'timeout'

export type Phase =
  | { type: 'turn'; player: PlayerIndex }
  | { type: 'feedback'; kind: FeedbackKind; player: PlayerIndex; endsAt: number }
  | { type: 'finished'; winner: PlayerIndex; reason: FinishReason; at: number }

export interface Clock {
  /** Remaining time committed when each clock was last stopped (or started). */
  remainingMs: readonly [number, number]
  /** Whose clock is running, if any. */
  running: PlayerIndex | null
  /** Timestamp the running clock started from. */
  since: number | null
}

export interface GameState {
  settings: Settings
  photoIds: readonly string[]
  photoIndex: number
  clock: Clock
  phase: Phase
  /** Latest timestamp seen; earlier timestamps are clamped to it. */
  lastNow: number
}

export type HostActionType = 'correct' | 'wrong' | 'pass'

export type Action = { type: 'tick'; now: number } | { type: HostActionType; now: number }
