import { describe, expect, it } from 'vitest'
import { computeStageScale, STAGE_HEIGHT, STAGE_WIDTH } from './stageScale'

const scaled = (w: number, h: number) => {
  const k = computeStageScale(w, h)
  return [STAGE_WIDTH * k, STAGE_HEIGHT * k]
}

describe('computeStageScale', () => {
  it('fits a wide window by height (2560×1080 → 1920×1080)', () => {
    expect(scaled(2560, 1080)).toEqual([1920, 1080])
  })

  it('fits a narrow window by width (1280×1024 → 1280×720)', () => {
    expect(scaled(1280, 1024)).toEqual([1280, 720])
  })

  it('is 1 at the artboard size', () => {
    expect(computeStageScale(1440, 810)).toBe(1)
  })
})
