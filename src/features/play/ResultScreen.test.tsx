// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { GameState } from '../../game'
import { startedGame } from '../../game/test-utils'
import { ResultScreen } from './ResultScreen'

const names = ['Назар', 'Олена'] as const

function finished(
  winner: 0 | 1 | null,
  reason: 'timeout' | 'photos_exhausted',
  remaining: [number, number],
): GameState {
  const s = startedGame(0)
  return {
    ...s,
    photoIndex: 22,
    clock: { remainingMs: remaining, running: null, since: null },
    phase: { type: 'finished', winner, reason, at: 100_000 },
    stats: [
      { correct: 14, wrong: 3, pass: 1 },
      { correct: 11, wrong: 5, pass: 2 },
    ],
  }
}

function show(state: GameState) {
  const onRematch = vi.fn()
  const onOtherCategory = vi.fn()
  render(
    <ResultScreen
      state={state}
      categoryName="Автомобілі"
      names={names}
      onRematch={onRematch}
      onOtherCategory={onOtherCategory}
    />,
  )
  return { onRematch, onOtherCategory }
}

describe('ResultScreen', () => {
  it('shows a timeout win with the remaining time', () => {
    show(finished(0, 'timeout', [14_200, 0]))
    expect(screen.getByText('Перемога')).toBeInTheDocument()
    expect(screen.getAllByText('Назар')[0]).toHaveClass('result__headline--p1')
    expect(screen.getByText('Час суперника вичерпано · залишилось 0:14')).toBeInTheDocument()
    expect(screen.getByText('Автомобілі · 23 фото')).toBeInTheDocument()
  })

  it('shows a photos-exhausted win with tenths under 10 s', () => {
    show(finished(1, 'photos_exhausted', [3_100, 7_460]))
    expect(screen.getAllByText('Олена')[0]).toHaveClass('result__headline--p2')
    expect(screen.getByText('Фото закінчились · залишилось 0:07.4')).toBeInTheDocument()
  })

  it('shows a draw', () => {
    show(finished(null, 'photos_exhausted', [12_300, 12_300]))
    expect(screen.getByText('Нічия')).toBeInTheDocument()
    expect(screen.getByText('Однаковий час у обох')).toBeInTheDocument()
  })

  it('shows stats with Ukrainian plurals', () => {
    show(finished(0, 'timeout', [14_200, 0]))
    const card = within(screen.getByRole('region', { name: 'Назар' }))
    expect(card.getByText('14').nextSibling).toHaveTextContent('правильно')
    expect(card.getByText('3').nextSibling).toHaveTextContent('помилки')
    expect(card.getByText('1').nextSibling).toHaveTextContent('пас')
    const other = within(screen.getByRole('region', { name: 'Олена' }))
    expect(other.getByText('5').nextSibling).toHaveTextContent('помилок')
    expect(other.getByText('2').nextSibling).toHaveTextContent('паси')
  })

  it('offers rematch and another category', () => {
    const { onRematch, onOtherCategory } = show(finished(0, 'timeout', [14_200, 0]))
    fireEvent.click(screen.getByRole('button', { name: 'Реванш' }))
    fireEvent.click(screen.getByRole('button', { name: 'Інша категорія' }))
    expect(onRematch).toHaveBeenCalledTimes(1)
    expect(onOtherCategory).toHaveBeenCalledTimes(1)
  })
})
