export const STAGE_WIDTH = 1440
export const STAGE_HEIGHT = 810

/** Uniform scale that fits the 16:9 stage into the window without cropping. */
export function computeStageScale(width: number, height: number): number {
  return Math.min(width / STAGE_WIDTH, height / STAGE_HEIGHT)
}
