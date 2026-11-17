import { describe, expect, it } from 'vitest'
import { createRng, shuffle } from './shuffle'

const items = Array.from({ length: 60 }, (_, i) => `p${i}`)

describe('createRng', () => {
  it('produces numbers in [0, 1)', () => {
    const rng = createRng(42)
    for (let i = 0; i < 1_000; i++) {
      const x = rng()
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(1)
    }
  })
})

describe('shuffle', () => {
  it('gives the same order for the same seed', () => {
    expect(shuffle(items, createRng(7))).toEqual(shuffle(items, createRng(7)))
  })

  it('gives different orders for different seeds', () => {
    expect(shuffle(items, createRng(1))).not.toEqual(shuffle(items, createRng(2)))
  })

  it('returns a permutation without repeats or losses', () => {
    const out = shuffle(items, createRng(123))
    expect(out).toHaveLength(items.length)
    expect(new Set(out).size).toBe(items.length)
    expect([...out].sort()).toEqual([...items].sort())
  })

  it('does not mutate the input', () => {
    const input = [...items]
    shuffle(input, createRng(5))
    expect(input).toEqual(items)
  })
})
