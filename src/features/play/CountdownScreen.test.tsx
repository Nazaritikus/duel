// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createGame, gameReducer } from '../../game'
import { PHOTOS } from '../../game/test-utils'
import { CountdownScreen } from './CountdownScreen'

const names = ['Назар', 'Олена'] as const

/** A seed for which the random starter is player 2. */
function seedForStarter(player: 0 | 1): number {
  for (let seed = 0; ; seed++) {
    const s = createGame({ photoIds: PHOTOS, now: 0, seed, settings: { firstPlayer: 'random' } })
    if (s.phase.type === 'countdown' && s.phase.starter === player) return seed
  }
}

describe('CountdownScreen', () => {
  it('shows a random starter (player 2) in their colour with full frozen times', () => {
    const state = createGame({
      photoIds: PHOTOS,
      now: 0,
      seed: seedForStarter(1),
      settings: { firstPlayer: 'random', timePerPlayerMs: 90_000 },
    })
    render(<CountdownScreen state={state} now={0} categoryName="Цифри" names={names} />)
    expect(screen.getByTestId('countdown')).toHaveClass('countdown--p2')
    expect(screen.getByText('Починає')).toBeInTheDocument()
    expect(screen.getAllByText('Олена')[0]).toHaveClass('countdown__name')
    expect(screen.getByText('Цифри')).toBeInTheDocument()
    expect(screen.getAllByText('1:30')).toHaveLength(2)
  })

  it('counts 3 → 2 → 1', () => {
    const state = createGame({ photoIds: PHOTOS, now: 0, seed: 1 })
    const { rerender } = render(
      <CountdownScreen state={state} now={0} categoryName="Цифри" names={names} />,
    )
    expect(screen.getByText('3')).toBeInTheDocument()
    rerender(<CountdownScreen state={state} now={1_200} categoryName="Цифри" names={names} />)
    expect(screen.getByText('2')).toBeInTheDocument()
    rerender(<CountdownScreen state={state} now={2_500} categoryName="Цифри" names={names} />)
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('shows the pause overlay and the frozen number when paused during the countdown', () => {
    const paused = gameReducer(createGame({ photoIds: PHOTOS, now: 0, seed: 1 }), {
      type: 'pause',
      now: 1_200,
    })
    render(<CountdownScreen state={paused} now={5_000} categoryName="Цифри" names={names} />)
    expect(screen.getByText('ПАУЗА')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })
})
