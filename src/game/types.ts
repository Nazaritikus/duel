export type PlayerIndex = 0 | 1

export interface Settings {
  /** Starting time on each player's clock. */
  timePerPlayerMs: number
  /** How long the correct answer is shown; both clocks are stopped. */
  correctFeedbackMs: number
  /** How long the correct answer is shown after a wrong answer or pass; the player's clock keeps running. */
  penaltyMs: number
  /** Length of the 3-2-1 countdown before the first turn; both clocks are stopped. */
  countdownMs: number
  /** Who answers first; 'random' is resolved once from the game seed. */
  firstPlayer: PlayerIndex | 'random'
}

export const DEFAULT_SETTINGS: Settings = {
  timePerPlayerMs: 60_000,
  correctFeedbackMs: 2_000,
  penaltyMs: 3_000,
  countdownMs: 3_000,
  firstPlayer: 0,
}

export type FeedbackKind = 'correct' | 'wrong' | 'pass'

export type FinishReason = 'timeout' | 'photos_exhausted'

export interface CountdownPhase {
  type: 'countdown'
  starter: PlayerIndex
  endsAt: number
}

export interface TurnPhase {
  type: 'turn'
  player: PlayerIndex
}

export interface FeedbackPhase {
  type: 'feedback'
  kind: FeedbackKind
  player: PlayerIndex
  endsAt: number
}

/** Phases the host can pause. */
export type ActivePhase = CountdownPhase | TurnPhase | FeedbackPhase

export interface PausedPhase {
  type: 'paused'
  /** The interrupted phase; its `endsAt` is shifted by the paused duration on resume. */
  resume: ActivePhase
  /** Whose clock was running when paused; it restarts on resume. */
  runningPlayer: PlayerIndex | null
  pausedAt: number
}

export interface FinishedPhase {
  type: 'finished'
  /** null means a draw (only possible when photos run out). */
  winner: PlayerIndex | null
  reason: FinishReason
  at: number
}

export type Phase = ActivePhase | PausedPhase | FinishedPhase

export interface Clock {
  /** Remaining time committed when each clock was last stopped (or started). */
  remainingMs: readonly [number, number]
  /** Whose clock is running, if any. */
  running: PlayerIndex | null
  /** Timestamp the running clock started from. */
  since: number | null
}

export interface PlayerStats {
  correct: number
  wrong: number
  pass: number
}

export interface GameState {
  settings: Settings
  /** Photos in the order they are shown (already shuffled). */
  photoIds: readonly string[]
  photoIndex: number
  clock: Clock
  phase: Phase
  stats: readonly [PlayerStats, PlayerStats]
  /** Latest timestamp seen; earlier timestamps are clamped to it. */
  lastNow: number
}

export interface CreateGameOptions {
  photoIds: readonly string[]
  now: number
  /** Seed for the photo shuffle and a random starting player; a rematch passes a new seed. */
  seed: number
  settings?: Partial<Settings>
}

export type HostActionType = 'correct' | 'wrong' | 'pass'

export type Action =
  | { type: 'tick'; now: number }
  | { type: HostActionType; now: number }
  | { type: 'pause'; now: number }
  | { type: 'resume'; now: number }
