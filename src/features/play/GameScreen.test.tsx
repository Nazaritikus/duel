// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { gameReducer, type GameState, type HostActionType } from '../../game'
import { startedGame } from '../../game/test-utils'
import { GameScreen } from './GameScreen'
import type { PlayCategory, PlayerNames } from './types'

const category: PlayCategory = {
  id: 'cars',
  name: 'Автомобілі',
  photos: [
    { id: 'a', src: '/a.jpg', answerSrc: '/a.answer.jpg', answer: 'Ferrari', isVertical: false },
    { id: 'b', src: '/b.jpg', answerSrc: null, answer: 'Volvo', isVertical: true },
    ...Array.from({ length: 8 }, (_, i) => ({
      id: `x${i}`,
      src: `/x${i}.jpg`,
      answerSrc: null,
      answer: `Авто ${i}`,
      isVertical: false,
    })),
  ],
}
const photosById = new Map(category.photos.map((p) => [p.id, p]))
const names: PlayerNames = ['Назар', 'Олена']

const act = (s: GameState, type: HostActionType | 'pause' | 'resume', now: number) =>
  gameReducer(s, { type, now })

function show(state: GameState, now: number) {
  return render(
    <GameScreen
      state={state}
      now={now}
      category={category}
      photosById={photosById}
      names={names}
    />,
  )
}

/** A started game whose current photo is `photoId`. */
function gameOn(photoId: string, settings = {}): GameState {
  const s = startedGame(
    0,
    settings,
    category.photos.map((p) => p.id),
  )
  const others = s.photoIds.filter((id) => id !== photoId)
  return { ...s, photoIds: [photoId, ...others] }
}

describe('GameScreen', () => {
  it('shows the header with the category and photo number', () => {
    const s = { ...gameOn('b'), photoIndex: 6 }
    show(s, 0)
    expect(screen.getByTestId('game-header-info')).toHaveTextContent(
      'Категорія: Автомобілі · фото 7',
    )
  })

  it('keeps the frozen player readable: tagged, not faded', () => {
    show(gameOn('b'), 5_000)
    const p2 = screen.getByTestId('panel-2')
    expect(p2).toHaveAttribute('data-tone', 'frozen')
    expect(within(p2).getByText('Заморожено')).toBeInTheDocument()
    expect(within(p2).getByText('1:00')).toBeInTheDocument()
    expect(p2.style.opacity).toBe('')
    expect(screen.getByTestId('panel-1')).toHaveAttribute('data-tone', 'active')
  })

  it('shows the photo framed in the active player colour', () => {
    show(gameOn('b'), 1_000)
    expect(screen.getByTestId('photo')).toHaveAttribute('src', '/b.jpg')
    expect(screen.getByTestId('photo-frame')).toHaveClass('photo-frame--p1')
  })

  it('shows tenths and a red frame in the last 10 s', () => {
    show(gameOn('b', { timePerPlayerMs: 9_000 }), 1_600)
    expect(within(screen.getByTestId('panel-1')).getByText('0:07.4')).toBeInTheDocument()
    expect(screen.getByText('Останні секунди')).toBeInTheDocument()
    expect(screen.getByTestId('photo-frame')).toHaveClass('photo-frame--wrong')
  })

  it('shows correct feedback with the answer and the next player', () => {
    show(act(gameOn('b'), 'correct', 10_000), 10_500)
    expect(screen.getByTestId('photo-frame')).toHaveClass('photo-frame--correct')
    const bar = screen.getByTestId('answer-bar')
    expect(within(bar).getByText('Volvo')).toBeInTheDocument()
    expect(within(bar).getByText('Наступний хід: Олена')).toBeInTheDocument()
    expect(within(screen.getByTestId('panel-1')).getByText('Правильно')).toBeInTheDocument()
    expect(within(screen.getByTestId('panel-2')).getByText('Наступний хід')).toBeInTheDocument()
  })

  it('shows pass feedback with the penalty while the time keeps running', () => {
    const s = act(gameOn('b'), 'pass', 10_000)
    const { rerender } = show(s, 10_200)
    const bar = screen.getByTestId('answer-bar')
    expect(within(bar).getByText('Volvo')).toBeInTheDocument()
    expect(within(bar).getByText('−3 с')).toBeInTheDocument()
    expect(within(bar).getByText('наступне фото через 3…')).toBeInTheDocument()
    expect(within(screen.getByTestId('panel-1')).getByText('Пас · штраф')).toBeInTheDocument()
    expect(within(screen.getByTestId('panel-1')).getByText('0:49')).toBeInTheDocument()

    rerender(
      <GameScreen
        state={s}
        now={12_500}
        category={category}
        photosById={photosById}
        names={names}
      />,
    )
    expect(within(screen.getByTestId('panel-1')).getByText('0:47')).toBeInTheDocument()
    expect(screen.getByText('наступне фото через 1…')).toBeInTheDocument()
  })

  it('shows "Помилка · штраф" for a wrong answer', () => {
    show(act(gameOn('b'), 'wrong', 10_000), 10_200)
    expect(screen.getByText('Помилка · штраф')).toBeInTheDocument()
    expect(screen.getByTestId('photo-frame')).toHaveClass('photo-frame--wrong')
  })

  it('replaces the question photo with the answer photo during feedback', () => {
    const s = gameOn('a')
    const { rerender } = show(s, 1_000)
    expect(screen.getByTestId('photo')).toHaveAttribute('src', '/a.jpg')
    const fb = act(s, 'wrong', 1_000)
    rerender(
      <GameScreen
        state={fb}
        now={1_500}
        category={category}
        photosById={photosById}
        names={names}
      />,
    )
    expect(screen.getByTestId('photo')).toHaveAttribute('src', '/a.answer.jpg')
  })

  it('hides the photo while paused and shows it again after resuming', () => {
    const paused = act(gameOn('b'), 'pause', 5_000)
    const { rerender } = show(paused, 6_000)
    expect(screen.getByText('ПАУЗА')).toBeInTheDocument()
    expect(screen.queryByTestId('photo')).not.toBeInTheDocument()

    const resumed = act(paused, 'resume', 9_000)
    rerender(
      <GameScreen
        state={resumed}
        now={9_000}
        category={category}
        photosById={photosById}
        names={names}
      />,
    )
    expect(screen.queryByText('ПАУЗА')).not.toBeInTheDocument()
    expect(screen.getByTestId('photo')).toHaveAttribute('src', '/b.jpg')
  })

  it('replaces a photo that fails to load with a message and keeps the game going', () => {
    const s = gameOn('b')
    const { rerender } = show(s, 0)
    fireEvent.error(screen.getByTestId('photo'))
    expect(screen.queryByTestId('photo')).not.toBeInTheDocument()
    expect(screen.getByText('Фото не завантажилось')).toBeInTheDocument()

    // The next photo is tried again.
    const next = { ...s, photoIds: ['a', ...s.photoIds.filter((id) => id !== 'a')] }
    rerender(
      <GameScreen state={next} now={0} category={category} photosById={photosById} names={names} />,
    )
    expect(screen.getByTestId('photo')).toHaveAttribute('src', '/a.jpg')
  })
})
