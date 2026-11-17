import { describe, expect, it } from 'vitest'
import { formatTime, isLastSeconds } from './format'

describe('formatTime', () => {
  it('shows a full minute as 1:00', () => {
    expect(formatTime(60_000)).toBe('1:00')
    expect(formatTime(90_000)).toBe('1:30')
  })

  it('truncates seconds instead of rounding up', () => {
    expect(formatTime(42_900)).toBe('0:42')
    expect(formatTime(59_999)).toBe('0:59')
  })

  it('truncates tenths in the last seconds', () => {
    expect(formatTime(7_460, { tenths: true })).toBe('0:07.4')
    expect(formatTime(9_999, { tenths: true })).toBe('0:09.9')
  })

  it('shows zero', () => {
    expect(formatTime(0)).toBe('0:00')
    expect(formatTime(0, { tenths: true })).toBe('0:00.0')
    expect(formatTime(-5)).toBe('0:00')
  })
})

describe('isLastSeconds', () => {
  it('starts strictly below 10 s', () => {
    expect(isLastSeconds(10_000)).toBe(false)
    expect(isLastSeconds(9_999)).toBe(true)
  })
})
