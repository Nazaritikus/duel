import { describe, expect, it } from 'vitest'
import { getRemainingMs } from './clock'
import { createGame, gameReducer, getCountdownSeconds, getCurrentPhotoId } from './reducer'
import { PHOTOS, startedGame } from './test-utils'
import type { Action, GameState, HostActionType } from './types'

const tick = (s: GameState, now: number) => gameReducer(s, { type: 'tick', now })
const act = (s: GameState, type: HostActionType | 'pause' | 'resume', now: number) =>
  gameReducer(s, { type, now } as Action)
const newGame = (seed = 1, settings = {}) =>
  createGame({ photoIds: PHOTOS, now: 0, seed, settings })

describe('createGame', () => {
  it('starts in a 3 s countdown with both clocks stopped', () => {
    const s = newGame()
    expect(s.phase).toEqual({ type: 'countdown', starter: 0, endsAt: 3_000 })
    expect(s.clock.running).toBeNull()
    expect(s.stats).toEqual([
      { correct: 0, wrong: 0, pass: 0 },
      { correct: 0, wrong: 0, pass: 0 },
    ])
  })

  it('throws on an empty photo list', () => {
    expect(() => createGame({ photoIds: [], now: 0, seed: 1 })).toThrow()
  })

  it('honours an explicit starting player', () => {
    expect(newGame(1, { firstPlayer: 1 }).phase).toMatchObject({ starter: 1 })
  })

  it('fixes a random starter from the seed (reproducible, both players possible)', () => {
    const starters = new Set<number>()
    for (let seed = 0; seed < 50; seed++) {
      const a = newGame(seed, { firstPlayer: 'random' })
      const b = newGame(seed, { firstPlayer: 'random' })
      expect(a.phase).toEqual(b.phase)
      if (a.phase.type === 'countdown') starters.add(a.phase.starter)
    }
    expect(starters).toEqual(new Set([0, 1]))
  })
})

describe('photo order', () => {
  it('shows the same order for the same seed', () => {
    expect(newGame(42).photoIds).toEqual(newGame(42).photoIds)
  })

  it('shows different orders for different seeds', () => {
    expect(newGame(1).photoIds).not.toEqual(newGame(2).photoIds)
  })

  it('does not repeat photos across 60 shown photos', () => {
    const photos = PHOTOS.slice(0, 60)
    let s = startedGame(0, {}, photos)
    const shown: string[] = []
    let t = 0
    while (s.phase.type !== 'finished') {
      shown.push(getCurrentPhotoId(s)!)
      s = act(s, 'correct', t)
      t += 2_000
      s = tick(s, t)
    }
    expect(shown).toHaveLength(60)
    expect(new Set(shown).size).toBe(60)
  })
})

describe('countdown', () => {
  it('keeps both clocks full during the countdown', () => {
    const s = tick(newGame(), 2_000)
    expect(getRemainingMs(s, 0, 2_000)).toBe(60_000)
    expect(getRemainingMs(s, 1, 2_000)).toBe(60_000)
  })

  it('counts 3 → 2 → 1', () => {
    const s = newGame()
    expect(getCountdownSeconds(s, 0)).toBe(3)
    expect(getCountdownSeconds(s, 1_500)).toBe(2)
    expect(getCountdownSeconds(s, 2_999)).toBe(1)
  })

  it('starts the starter turn with the first photo when it ends', () => {
    const s = tick(newGame(1, { firstPlayer: 1 }), 3_000)
    expect(s.phase).toEqual({ type: 'turn', player: 1 })
    expect(getCurrentPhotoId(s)).toBe(s.photoIds[0])
    expect(getCountdownSeconds(s, 3_000)).toBeNull()
  })

  it('does not charge the starter for a late tick', () => {
    const s = tick(newGame(), 5_000)
    expect(getRemainingMs(s, 0, 5_000)).toBe(58_000)
    expect(getRemainingMs(s, 1, 5_000)).toBe(60_000)
  })
})

describe('pause', () => {
  it('suspends the rest of a penalty (pause 1 s into 3 s)', () => {
    let s = act(startedGame(0, { timePerPlayerMs: 20_000 }), 'wrong', 0)
    s = act(s, 'pause', 1_000)
    s = act(s, 'resume', 50_000)
    expect(s.phase).toMatchObject({ type: 'feedback', kind: 'wrong', endsAt: 52_000 })
    s = tick(s, 51_999)
    expect(s.phase.type).toBe('feedback')
    s = tick(s, 52_000)
    expect(s.phase).toEqual({ type: 'turn', player: 0 })
    expect(getRemainingMs(s, 0, 52_000)).toBe(17_000)
  })

  it('freezes both clocks while paused', () => {
    let s = startedGame(0)
    s = act(s, 'pause', 30_000)
    expect(s.phase.type).toBe('paused')
    expect(getRemainingMs(s, 0, 40_000)).toBe(30_000)
    expect(getRemainingMs(s, 1, 40_000)).toBe(60_000)
    s = act(s, 'resume', 40_000)
    expect(s.phase).toEqual({ type: 'turn', player: 0 })
    expect(getRemainingMs(s, 0, 40_000)).toBe(30_000)
    expect(getRemainingMs(s, 0, 41_000)).toBe(29_000)
  })

  it('suspends correct feedback (pause 0.5 s into 2 s)', () => {
    let s = act(startedGame(0), 'correct', 10_000)
    s = act(s, 'pause', 10_500)
    s = act(s, 'resume', 20_000)
    s = tick(s, 21_499)
    expect(s.phase.type).toBe('feedback')
    s = tick(s, 21_500)
    expect(s.phase).toEqual({ type: 'turn', player: 1 })
    expect(getRemainingMs(s, 0, 21_500)).toBe(50_000)
    expect(getRemainingMs(s, 1, 21_500)).toBe(60_000)
  })

  it('suspends the countdown (pause 1 s in, 2 s left after resume)', () => {
    let s = act(newGame(), 'pause', 1_000)
    s = act(s, 'resume', 10_000)
    expect(getCountdownSeconds(s, 10_000)).toBe(2)
    s = tick(s, 11_999)
    expect(s.phase.type).toBe('countdown')
    s = tick(s, 12_000)
    expect(s.phase).toEqual({ type: 'turn', player: 0 })
    expect(getRemainingMs(s, 0, 12_000)).toBe(60_000)
  })

  it('does nothing after the game finished', () => {
    const done = tick(startedGame(0), 70_000)
    expect(done.phase.type).toBe('finished')
    expect(act(done, 'pause', 71_000)).toBe(done)
  })

  it('ignores a repeated pause and a resume when not paused', () => {
    const paused = act(startedGame(0), 'pause', 1_000)
    expect(act(paused, 'pause', 2_000)).toBe(paused)
    const running = startedGame(0)
    expect(act(running, 'resume', 0)).toBe(running)
  })

  it('lets a time-out that already happened win over a late pause', () => {
    const s = act(startedGame(0), 'pause', 61_000)
    expect(s.phase).toMatchObject({ type: 'finished', winner: 1, reason: 'timeout', at: 60_000 })
  })
})

describe('host input outside an active turn', () => {
  it('ignores judgements during the countdown', () => {
    const s = newGame()
    expect(act(s, 'correct', 1_000)).toBe(s)
    expect(tick(act(s, 'correct', 1_000), 3_000).phase).toEqual({ type: 'turn', player: 0 })
  })

  it('ignores judgements while paused and does not count them', () => {
    const paused = act(startedGame(0), 'pause', 5_000)
    expect(act(paused, 'wrong', 6_000)).toBe(paused)
  })
})

describe('photos exhausted', () => {
  const three = ['a', 'b', 'c']

  /**
   * Reaches the last of three photos on player 1's turn with exactly `p1Ms` / `p2Ms` left:
   * both earlier photos are answered instantly, so no clock time is spent getting there.
   */
  function atLastPhoto(p1Ms: number, p2Ms: number): { s: GameState; t: number } {
    let s = startedGame(0, {}, three)
    s = { ...s, clock: { ...s.clock, remainingMs: [p1Ms, p2Ms] } }
    s = act(s, 'correct', 0)
    s = tick(s, 2_000) // P2 turn, photo 2
    s = act(s, 'correct', 2_000)
    s = tick(s, 4_000) // P1 turn, photo 3 (last)
    expect(getCurrentPhotoId(s)).toBe(s.photoIds[2])
    return { s, t: 4_000 }
  }

  it('awards the player with more time (14.2 s vs 9.8 s)', () => {
    const { s, t } = atLastPhoto(14_200, 9_800)
    let done = act(s, 'correct', t)
    done = tick(done, t + 2_000)
    expect(done.phase).toEqual({
      type: 'finished',
      winner: 0,
      reason: 'photos_exhausted',
      at: t + 2_000,
    })
  })

  it('is a draw with equal time (12.3 s vs 12.3 s)', () => {
    const { s, t } = atLastPhoto(12_300, 12_300)
    const done = tick(act(s, 'correct', t), t + 2_000)
    expect(done.phase).toMatchObject({ type: 'finished', winner: null, reason: 'photos_exhausted' })
  })

  it('is a draw within the same tenth (12.34 s vs 12.39 s)', () => {
    const { s, t } = atLastPhoto(12_340, 12_390)
    const done = tick(act(s, 'correct', t), t + 2_000)
    expect(done.phase).toMatchObject({ winner: null, reason: 'photos_exhausted' })
  })

  it('still charges the penalty for a wrong answer on the last photo', () => {
    const { s, t } = atLastPhoto(10_000, 8_500)
    const done = tick(act(s, 'wrong', t), t + 3_000)
    expect(done.phase).toEqual({
      type: 'finished',
      winner: 1,
      reason: 'photos_exhausted',
      at: t + 3_000,
    })
    expect(getRemainingMs(done, 0, t + 3_000)).toBe(7_000)
    expect(getRemainingMs(done, 1, t + 3_000)).toBe(8_500)
  })

  it('is still a time-out when the clock runs out during the last penalty', () => {
    const { s, t } = atLastPhoto(1_500, 30_000)
    const done = tick(act(s, 'pass', t), t + 3_000)
    expect(done.phase).toEqual({ type: 'finished', winner: 1, reason: 'timeout', at: t + 1_500 })
  })
})

describe('statistics', () => {
  it('counts correct, wrong and pass per player', () => {
    let s = startedGame(0)
    s = act(s, 'wrong', 1_000) // P1 wrong
    s = tick(s, 4_000)
    s = act(s, 'pass', 5_000) // P1 pass
    s = tick(s, 8_000)
    s = act(s, 'correct', 9_000) // P1 correct
    s = tick(s, 11_000)
    s = act(s, 'correct', 12_000) // P2 correct
    s = tick(s, 200_000) // P1 times out
    expect(s.phase.type).toBe('finished')
    expect(s.stats).toEqual([
      { correct: 1, wrong: 1, pass: 1 },
      { correct: 1, wrong: 0, pass: 0 },
    ])
  })

  it('does not count ignored presses (feedback, paused, finished)', () => {
    let s = act(startedGame(0), 'correct', 1_000)
    s = act(s, 'correct', 1_500) // during feedback
    s = tick(s, 3_000)
    s = act(s, 'pause', 4_000)
    s = act(s, 'wrong', 4_500) // while paused
    s = act(s, 'resume', 5_000)
    s = tick(s, 200_000) // P2 times out
    s = act(s, 'pass', 200_001) // after finish
    expect(s.stats).toEqual([
      { correct: 1, wrong: 0, pass: 0 },
      { correct: 0, wrong: 0, pass: 0 },
    ])
  })
})
