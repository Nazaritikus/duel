import { describe, expect, it } from 'vitest'
import { createGame, gameReducer, getCurrentPhotoId, getRemainingMs, type GameState } from './index'

describe('scripted full game', () => {
  it('plays turns until a time-out and reports the winner', () => {
    const photos = Array.from({ length: 50 }, (_, i) => `p${i}`)
    let s: GameState = createGame(photos, 0, {
      timePerPlayerMs: 10_000,
      correctFeedbackMs: 2_000,
      penaltyMs: 3_000,
    })

    s = gameReducer(s, { type: 'correct', now: 2_000 }) // P1: 8.0 s left
    s = gameReducer(s, { type: 'tick', now: 4_000 }) // P2 starts at 4.0
    s = gameReducer(s, { type: 'wrong', now: 5_000 }) // P2 penalty until 8.0
    s = gameReducer(s, { type: 'tick', now: 8_000 })
    expect(s.phase).toEqual({ type: 'turn', player: 1 })
    expect(getRemainingMs(s, 1, 8_000)).toBe(6_000)

    s = gameReducer(s, { type: 'correct', now: 9_000 }) // P2: 5.0 s left
    s = gameReducer(s, { type: 'tick', now: 11_000 }) // P1 starts at 11.0
    s = gameReducer(s, { type: 'pass', now: 12_000 })
    expect(getCurrentPhotoId(s)).toBe('p3')

    s = gameReducer(s, { type: 'tick', now: 30_000 }) // P1 runs out at 19.0
    expect(s.phase).toEqual({ type: 'finished', winner: 1, reason: 'timeout', at: 19_000 })
    expect(getRemainingMs(s, 0, 30_000)).toBe(0)
    expect(getRemainingMs(s, 1, 30_000)).toBe(5_000)
    expect(getCurrentPhotoId(s)).toBe('p4')
  })
})
