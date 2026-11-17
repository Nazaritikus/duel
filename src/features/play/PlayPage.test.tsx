// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createTestClock } from '../../test/testClock'
import { PlayPage } from './PlayPage'
import type { PlayCategory } from './types'

const category: PlayCategory = {
  id: 'demo',
  name: 'Демо',
  photos: ['a', 'b', 'c'].map((id) => ({
    id,
    src: `/${id}.svg`,
    answerSrc: null,
    answer: `Відповідь ${id}`,
    isVertical: false,
  })),
}

const key = (code: string) => fireEvent.keyDown(window, { code })

describe('PlayPage', () => {
  it('loads, counts down, and plays a turn with the keyboard', async () => {
    const t = createTestClock(0)
    render(<PlayPage loadCategory={async () => category} clock={t.clock} initialSeed={1} />)
    expect(screen.getByText('Завантаження…')).toBeInTheDocument()

    expect(await screen.findByTestId('interim-countdown')).toHaveTextContent('Починає: Гравець 1')
    expect(screen.getByText('3')).toBeInTheDocument()

    t.advance(3_000)
    expect(screen.getByTestId('game-header-info')).toHaveTextContent('Категорія: Демо · фото 1')
    expect(screen.getByTestId('panel-1')).toHaveAttribute('data-tone', 'active')

    t.advance(1_000)
    key('Enter')
    expect(screen.getByTestId('photo-frame')).toHaveClass('photo-frame--correct')
    expect(screen.getByText('Наступний хід: Гравець 2')).toBeInTheDocument()

    t.advance(2_000)
    expect(screen.getByTestId('game-header-info')).toHaveTextContent('фото 2')
    expect(screen.getByTestId('panel-2')).toHaveAttribute('data-tone', 'active')
  })

  it('pauses and resumes with Space', async () => {
    const t = createTestClock(0)
    render(<PlayPage loadCategory={async () => category} clock={t.clock} initialSeed={1} />)
    await screen.findByTestId('interim-countdown')
    t.advance(3_000)

    key('Space')
    expect(screen.getByText('ПАУЗА')).toBeInTheDocument()
    expect(screen.queryByTestId('photo')).not.toBeInTheDocument()
    key('Space')
    expect(screen.queryByText('ПАУЗА')).not.toBeInTheDocument()
  })

  it('plays to the end and restarts with Enter', async () => {
    const t = createTestClock(0)
    render(<PlayPage loadCategory={async () => category} clock={t.clock} initialSeed={1} />)
    await screen.findByTestId('interim-countdown')
    t.advance(3_000)
    for (let i = 0; i < 3; i++) {
      key('Enter')
      t.advance(2_000)
    }
    expect(screen.getByTestId('interim-result')).toHaveTextContent('Фото закінчились')

    key('Enter')
    expect(screen.getByTestId('interim-countdown')).toBeInTheDocument()
  })

  it('shows an error with a retry', async () => {
    const loadCategory = vi
      .fn<() => Promise<PlayCategory>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(category)
    render(<PlayPage loadCategory={loadCategory} clock={createTestClock().clock} initialSeed={1} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Спробувати ще' }))
    await waitFor(() => expect(screen.getByTestId('interim-countdown')).toBeInTheDocument())
  })
})
