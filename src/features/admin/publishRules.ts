import { pluralUk } from '../play/pluralUk'

/** Minimum photos a category needs to be published (also enforced by the DB trigger). */
export const MIN_PHOTOS = 50

export interface CategoryStats {
  photoCount: number
  missingAnswers: number
  verticalCount: number
}

const photosForms = ['фото', 'фото', 'фото'] as const

/** Every reason the category cannot be published, in Ukrainian; empty when it can be. */
export function getPublishProblems(stats: Pick<CategoryStats, 'photoCount' | 'missingAnswers'>) {
  const problems: string[] = []
  if (stats.photoCount < MIN_PHOTOS) {
    problems.push(`Потрібно щонайменше ${MIN_PHOTOS} фото, зараз ${stats.photoCount}`)
  }
  if (stats.missingAnswers > 0) {
    problems.push(
      `${stats.missingAnswers} ${pluralUk(stats.missingAnswers, photosForms)} без відповіді`,
    )
  }
  return problems
}

/** «72 фото · 1 без відповіді · 1 вертикальне» */
export function formatStats(stats: CategoryStats): string {
  return [
    `${stats.photoCount} фото`,
    `${stats.missingAnswers} без відповіді`,
    `${stats.verticalCount} ${pluralUk(stats.verticalCount, ['вертикальне', 'вертикальні', 'вертикальних'])}`,
  ].join(' · ')
}

/** «сьогодні», «12 лист.» this year, «12 лист. 2025 р.» otherwise. */
export function formatUpdated(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  if (date.toDateString() === now.toDateString()) return 'сьогодні'
  const sameYear = date.getFullYear() === now.getFullYear()
  return new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(date)
}
