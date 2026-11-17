// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createTestClock } from '../../test/testClock'
import { useGame } from './useGame'

const photoIds = ['a', 'b', 'c']

describe('useGame', () => {
  it('ticks the countdown into the first turn', () => {
    const t = createTestClock(1_000)
    const { result } = renderHook(() => useGame({ photoIds, seed: 1, clock: t.clock }))
    expect(result.current.state.phase.type).toBe('countdown')

    t.advance(2_000)
    expect(result.current.state.phase.type).toBe('countdown')
    t.advance(1_000)
    expect(result.current.state.phase).toEqual({ type: 'turn', player: 0 })
    expect(result.current.now).toBe(4_000)
  })

  it('dispatches commands with the current time', () => {
    const t = createTestClock(0)
    const { result } = renderHook(() =>
      useGame({ photoIds, seed: 1, clock: t.clock, settings: { countdownMs: 0 } }),
    )
    t.advance(500)
    act(() => result.current.command('wrong'))
    expect(result.current.state.phase).toMatchObject({
      type: 'feedback',
      kind: 'wrong',
      endsAt: 3_500,
    })
  })

  it('stops the frame loop once the game is finished', () => {
    const t = createTestClock(0)
    const { result } = renderHook(() =>
      useGame({
        photoIds,
        seed: 1,
        clock: t.clock,
        settings: { countdownMs: 0, timePerPlayerMs: 1_000 },
      }),
    )
    t.advance(10)
    expect(t.pendingFrames()).toBe(1)
    t.advance(2_000)
    expect(result.current.state.phase.type).toBe('finished')
    expect(t.pendingFrames()).toBe(0)
  })

  it('cancels the frame loop on unmount', () => {
    const t = createTestClock(0)
    const { unmount } = renderHook(() => useGame({ photoIds, seed: 1, clock: t.clock }))
    expect(t.pendingFrames()).toBe(1)
    unmount()
    expect(t.pendingFrames()).toBe(0)
  })
})
