import { getRemainingMs, type GameState } from '../../../game'

export type Cue = 'correct' | 'wrong' | 'tick' | 'gameOver'

export interface Frame {
  state: GameState
  now: number
}

/** Whole seconds left on the clock, as the last-10-s display counts them down. */
const wholeSeconds = (frame: Frame, player: 0 | 1) =>
  Math.ceil(getRemainingMs(frame.state, player, frame.now) / 1000)

const TICK_FROM = 10

/**
 * Sounds to play for the change from one rendered frame to the next (spec: game-ui / Sound
 * effects). Pure, so every rule is unit-tested against the real engine.
 */
export function cuesBetween(prev: Frame | null, next: Frame): Cue[] {
  const a = prev?.state.phase
  const b = next.state.phase
  const cues: Cue[] = []

  if (b.type === 'feedback' && !(a?.type === 'feedback' && a.endsAt === b.endsAt)) {
    cues.push(b.kind === 'correct' ? 'correct' : 'wrong')
  }
  if (b.type === 'finished' && a?.type !== 'finished') cues.push('gameOver')

  if (prev && a?.type === 'turn' && b.type === 'turn' && a.player === b.player) {
    const before = wholeSeconds(prev, a.player)
    const after = wholeSeconds(next, b.player)
    if (after < before && after <= TICK_FROM && after >= 1) cues.push('tick')
  }
  return cues
}
