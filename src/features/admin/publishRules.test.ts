import { describe, expect, it } from 'vitest'
import { formatStats, formatUpdated, getPublishProblems, MIN_PHOTOS } from './publishRules'

describe('getPublishProblems', () => {
  it('requires at least 50 photos', () => {
    expect(MIN_PHOTOS).toBe(50)
    expect(getPublishProblems({ photoCount: 0, missingAnswers: 0 })).toEqual([
      'Потрібно щонайменше 50 фото, зараз 0',
    ])
    expect(getPublishProblems({ photoCount: 49, missingAnswers: 0 })).toHaveLength(1)
    expect(getPublishProblems({ photoCount: 50, missingAnswers: 0 })).toEqual([])
  })

  it('reports photos without an answer', () => {
    expect(getPublishProblems({ photoCount: 72, missingAnswers: 3 })).toEqual([
      '3 фото без відповіді',
    ])
  })

  it('lists both reasons', () => {
    expect(getPublishProblems({ photoCount: 12, missingAnswers: 3 })).toHaveLength(2)
  })
})

describe('formatStats', () => {
  it('uses Ukrainian plurals for vertical photos', () => {
    expect(formatStats({ photoCount: 72, missingAnswers: 1, verticalCount: 1 })).toBe(
      '72 фото · 1 без відповіді · 1 вертикальне',
    )
    expect(formatStats({ photoCount: 5, missingAnswers: 0, verticalCount: 3 })).toContain(
      '3 вертикальні',
    )
    expect(formatStats({ photoCount: 5, missingAnswers: 0, verticalCount: 5 })).toContain(
      '5 вертикальних',
    )
  })
})

describe('formatUpdated', () => {
  const now = new Date(2026, 10, 18, 15, 0)

  it('says «сьогодні» for today', () => {
    expect(formatUpdated(new Date(2026, 10, 18, 1, 0).toISOString(), now)).toBe('сьогодні')
  })

  it('shows a short date this year', () => {
    expect(formatUpdated(new Date(2026, 10, 12, 9, 0).toISOString(), now)).toMatch(/^12 лист/)
  })

  it('adds the year for other years', () => {
    expect(formatUpdated(new Date(2025, 9, 28).toISOString(), now)).toMatch(/28 жовт.*2025/)
  })
})
