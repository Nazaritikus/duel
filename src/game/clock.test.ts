import { describe, expect, it } from 'vitest'
import { getRemainingMs, stopClock, timeoutAt } from './clock'
import { gameReducer } from './reducer'
import { startedGame } from './test-utils'

describe('clock', () => {
  it('runs only the active player clock', () => {
    const s = startedGame(0)
    expect(getRemainingMs(s, 0, 5_000)).toBe(55_000)
    expect(getRemainingMs(s, 1, 5_000)).toBe(60_000)
  })

  it('commits the elapsed segment on stop', () => {
    const s = startedGame(1_000)
    const stopped = stopClock(s.clock, 4_500)
    expect(stopped).toEqual({ remainingMs: [56_500, 60_000], running: null, since: null })
    expect(timeoutAt(stopped)).toBeNull()
  })

  it('reports the moment the running clock hits zero', () => {
    const s = startedGame(2_000)
    expect(timeoutAt(s.clock)).toBe(62_000)
  })

  it('never lets time flow backwards', () => {
    const s = gameReducer(startedGame(0), { type: 'tick', now: 10_000 })
    expect(getRemainingMs(s, 0, 4_000)).toBe(50_000)
    const back = gameReducer(s, { type: 'tick', now: 3_000 })
    expect(back).toBe(s)
    expect(getRemainingMs(back, 0, 10_000)).toBe(50_000)
  })
})
