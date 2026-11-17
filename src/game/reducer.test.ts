import { describe, expect, it } from 'vitest'
import { getRemainingMs } from './clock'
import { gameReducer, getCurrentPhotoId } from './reducer'
import { startedGame } from './test-utils'
import type { Action, GameState, HostActionType } from './types'

const tick = (s: GameState, now: number) => gameReducer(s, { type: 'tick', now })
const act = (s: GameState, type: HostActionType, now: number) => gameReducer(s, { type, now })

describe('first turn after the countdown', () => {
  it('starts player 1 turn with the first photo and only their clock running', () => {
    const s = startedGame(0)
    expect(s.phase).toEqual({ type: 'turn', player: 0 })
    expect(getCurrentPhotoId(s)).toBe(s.photoIds[0])
    expect(getRemainingMs(s, 0, 3_000)).toBe(57_000)
    expect(getRemainingMs(s, 1, 3_000)).toBe(60_000)
  })
})

describe('correct answer', () => {
  it('stops both clocks for 2 s, then passes the turn with the next photo', () => {
    let s = act(startedGame(0), 'correct', 10_000)
    expect(s.phase).toMatchObject({ type: 'feedback', kind: 'correct', player: 0, endsAt: 12_000 })

    s = tick(s, 11_000)
    expect(getRemainingMs(s, 0, 11_000)).toBe(50_000)
    expect(getRemainingMs(s, 1, 11_000)).toBe(60_000)

    s = tick(s, 12_000)
    expect(s.phase).toEqual({ type: 'turn', player: 1 })
    expect(getCurrentPhotoId(s)).toBe(s.photoIds[1])

    s = tick(s, 13_000)
    expect(getRemainingMs(s, 1, 13_000)).toBe(59_000)
    expect(getRemainingMs(s, 0, 13_000)).toBe(50_000)
  })

  it('does not charge the next player for a late tick', () => {
    let s = act(startedGame(0), 'correct', 10_000)
    s = tick(s, 15_000) // first tick arrives 3 s after the feedback ended
    expect(s.phase).toEqual({ type: 'turn', player: 1 })
    expect(getRemainingMs(s, 1, 15_000)).toBe(57_000)
  })
})

describe('wrong answer or pass', () => {
  it('consumes the penalty from the player clock (20.0 s -> 17.0 s)', () => {
    let s = startedGame(0, { timePerPlayerMs: 20_000 })
    s = act(s, 'wrong', 0)
    expect(s.phase).toMatchObject({ type: 'feedback', kind: 'wrong', player: 0, endsAt: 3_000 })

    s = tick(s, 3_000)
    expect(s.phase).toEqual({ type: 'turn', player: 0 })
    expect(getCurrentPhotoId(s)).toBe(s.photoIds[1])
    expect(getRemainingMs(s, 0, 3_000)).toBe(17_000)
    expect(getRemainingMs(s, 1, 3_000)).toBe(20_000)
  })

  it('treats pass like a wrong answer with its own label', () => {
    let s = act(startedGame(0), 'pass', 5_000)
    expect(s.phase).toMatchObject({ type: 'feedback', kind: 'pass', player: 0, endsAt: 8_000 })
    s = tick(s, 8_000)
    expect(s.phase).toEqual({ type: 'turn', player: 0 })
    expect(getCurrentPhotoId(s)).toBe(s.photoIds[1])
    expect(getRemainingMs(s, 0, 8_000)).toBe(52_000)
  })
})

describe('host input outside an active turn', () => {
  it('ignores a double press during correct feedback', () => {
    const fb = act(startedGame(0), 'correct', 10_000)
    expect(act(fb, 'correct', 11_000)).toBe(fb)
    const s = tick(fb, 12_000)
    expect(s.phase).toEqual({ type: 'turn', player: 1 })
    expect(s.photoIndex).toBe(1)
  })

  it('does not extend or restart an ongoing penalty', () => {
    const fb = act(startedGame(0), 'wrong', 0)
    const again = act(fb, 'wrong', 1_000)
    expect(again).toBe(fb)
    expect(again.phase).toMatchObject({ endsAt: 3_000 })
  })

  it('ignores input after the game finished', () => {
    const done = tick(startedGame(0), 70_000)
    expect(done.phase.type).toBe('finished')
    expect(act(done, 'correct', 71_000)).toBe(done)
  })
})

describe('end of game on time-out', () => {
  it('finishes at the exact moment the clock hits 0', () => {
    const s = tick(startedGame(0), 61_234)
    expect(s.phase).toEqual({ type: 'finished', winner: 1, reason: 'timeout', at: 60_000 })
    expect(getRemainingMs(s, 0, 61_234)).toBe(0)
    expect(getRemainingMs(s, 1, 61_234)).toBe(60_000)
  })

  it('ignores a host action that arrives after the time-out', () => {
    const s = act(startedGame(0), 'correct', 60_500)
    expect(s.phase).toMatchObject({ type: 'finished', winner: 1, at: 60_000 })
  })

  it('finishes during a penalty without waiting for the feedback to end', () => {
    let s = startedGame(0, { timePerPlayerMs: 1_500 })
    s = act(s, 'wrong', 0)
    s = tick(s, 1_000)
    expect(s.phase.type).toBe('feedback')
    s = tick(s, 1_500)
    expect(s.phase).toEqual({ type: 'finished', winner: 1, reason: 'timeout', at: 1_500 })
    expect(getRemainingMs(s, 0, 1_500)).toBe(0)
  })

  it('resolves a penalty time-out correctly even from a single late tick', () => {
    let s = startedGame(0, { timePerPlayerMs: 1_500 })
    s = tick(act(s, 'wrong', 0), 5_000)
    expect(s.phase).toEqual({ type: 'finished', winner: 1, reason: 'timeout', at: 1_500 })
  })
})

describe('timing does not drift', () => {
  const events: { t: number; type: HostActionType }[] = [
    { t: 7_013, type: 'correct' },
    { t: 20_457, type: 'wrong' },
    { t: 31_002, type: 'pass' },
    { t: 45_999, type: 'correct' },
    { t: 52_340, type: 'wrong' },
  ]

  function play(tickEveryMs: number, endAt: number): GameState {
    let s = startedGame(0)
    const actions: Action[] = events.map((e) => ({ type: e.type, now: e.t }))
    for (let t = tickEveryMs; t < endAt; t += tickEveryMs) {
      while (actions.length && actions[0].now <= t) s = gameReducer(s, actions.shift()!)
      s = tick(s, t)
    }
    for (const a of actions) s = gameReducer(s, a)
    return tick(s, endAt)
  }

  it('gives identical results with 16 ms and 5 s ticks', () => {
    const fine = play(16, 60_000)
    const coarse = play(5_000, 60_000)
    expect(coarse.phase).toEqual(fine.phase)
    expect(coarse.photoIndex).toBe(fine.photoIndex)
    for (const p of [0, 1] as const) {
      expect(getRemainingMs(coarse, p, 60_000)).toBe(getRemainingMs(fine, p, 60_000))
    }
  })
})
