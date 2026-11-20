import { describe, expect, it } from 'vitest'
import { gameReducer, type GameState } from '../../../game'
import { startedGame } from '../../../game/test-utils'
import { cuesBetween, type Cue, type Frame } from './cues'

const step = (
  s: GameState,
  type: 'correct' | 'wrong' | 'pass' | 'check' | 'pause' | 'resume' | 'tick',
  now: number,
) => gameReducer(s, { type, now })

/** Renders frames every `dt` ms from `from` to `to` and collects the cues with their times. */
function run(state: GameState, from: number, to: number, dt = 16) {
  let s = state
  let prev: Frame | null = { state: s, now: from }
  const heard: [number, Cue][] = []
  for (let now = from + dt; now <= to; now += dt) {
    s = step(s, 'tick', now)
    const next = { state: s, now }
    for (const cue of cuesBetween(prev, next)) heard.push([now, cue])
    prev = next
  }
  return { heard, state: s, prev: prev! }
}

describe('cuesBetween', () => {
  it('is silent when a check starts and while it lasts, even in the last 10 s', () => {
    const s0 = startedGame(0, { timePerPlayerMs: 60_000 })
    const checking = step(s0, 'check', 52_500) // 7.5 s left
    expect(cuesBetween({ state: s0, now: 52_490 }, { state: checking, now: 52_500 })).toEqual([])
    expect(run(checking, 52_500, 60_000).heard).toEqual([])
  })

  it('plays correct and wrong once when feedback starts', () => {
    const s0 = startedGame(0, { timePerPlayerMs: 60_000 })
    const correct = step(s0, 'correct', 1000)
    expect(cuesBetween({ state: s0, now: 990 }, { state: correct, now: 1000 })).toEqual(['correct'])
    expect(cuesBetween({ state: correct, now: 1000 }, { state: correct, now: 1016 })).toEqual([])

    const wrong = step(s0, 'wrong', 1000)
    expect(cuesBetween({ state: s0, now: 990 }, { state: wrong, now: 1000 })).toEqual(['wrong'])
    const pass = step(s0, 'pass', 1000)
    expect(cuesBetween({ state: s0, now: 990 }, { state: pass, now: 1000 })).toEqual(['wrong'])
  })

  it('ticks on each whole second of the last 10 s, then plays game over once', () => {
    const s0 = startedGame(0, { timePerPlayerMs: 45_000 })
    const { heard } = run(s0, 0, 46_000)
    const ticks = heard.filter(([, c]) => c === 'tick').map(([t]) => t)
    // One tick as the display reaches 10, 9, …, 1 seconds left.
    expect(ticks).toHaveLength(10)
    expect(ticks[0]).toBeGreaterThanOrEqual(35_000)
    expect(ticks[0]).toBeLessThan(35_020)
    expect(heard.filter(([, c]) => c === 'gameOver')).toHaveLength(1)
    expect(heard.at(-1)![1]).toBe('gameOver')
  })

  it('never ticks while paused', () => {
    const s0 = startedGame(0, { timePerPlayerMs: 45_000 })
    const paused = step(s0, 'pause', 36_000)
    const { heard } = run(paused, 36_000, 50_000)
    expect(heard).toEqual([])
  })

  it('does not tick above 10 seconds', () => {
    const s0 = startedGame(0, { timePerPlayerMs: 45_000 })
    const { heard } = run(s0, 0, 34_000)
    expect(heard).toEqual([])
  })
})
