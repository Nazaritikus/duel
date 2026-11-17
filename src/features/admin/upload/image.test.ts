import { describe, expect, it } from 'vitest'
import { isVerticalImage, targetSize } from './image'
import { runQueue } from './queue'

describe('targetSize', () => {
  it('fits the longer side into 1600 px', () => {
    expect(targetSize(4000, 3000)).toEqual({ width: 1600, height: 1200 })
    expect(targetSize(3000, 4000)).toEqual({ width: 1200, height: 1600 })
  })

  it('never scales up', () => {
    expect(targetSize(800, 600)).toEqual({ width: 800, height: 600 })
  })

  it('marks portrait images vertical', () => {
    expect(isVerticalImage(targetSize(3000, 4000))).toBe(true)
    expect(isVerticalImage({ width: 100, height: 100 })).toBe(false)
  })
})

describe('runQueue', () => {
  it('keeps at most `concurrency` tasks in flight and survives failures', async () => {
    let active = 0
    let peak = 0
    const settled: number[] = []
    const tasks = Array.from({ length: 7 }, (_, i) => async () => {
      active++
      peak = Math.max(peak, active)
      await new Promise((r) => setTimeout(r, 2))
      active--
      if (i === 3) throw new Error('bad')
      return i
    })
    const results = await runQueue(tasks, 3, (i) => settled.push(i))
    expect(peak).toBe(3)
    expect(settled).toHaveLength(7)
    expect(results[3].status).toBe('rejected')
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(6)
  })

  it('handles an empty list', async () => {
    expect(await runQueue([], 3)).toEqual([])
  })
})
