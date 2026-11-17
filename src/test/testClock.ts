import { act } from '@testing-library/react'
import type { FrameClock } from '../features/play/useGame'

/** A manual clock + frame scheduler: `advance(ms)` moves time and runs one round of frames. */
export function createTestClock(start = 0) {
  let t = start
  let nextId = 1
  const frames = new Map<number, () => void>()
  const clock: FrameClock = {
    now: () => t,
    requestFrame: (cb) => {
      const id = nextId++
      frames.set(id, cb)
      return id
    },
    cancelFrame: (id) => {
      frames.delete(id)
    },
  }
  return {
    clock,
    advance(ms: number) {
      t += ms
      const due = [...frames.values()]
      frames.clear()
      act(() => due.forEach((cb) => cb()))
    },
    pendingFrames: () => frames.size,
  }
}
