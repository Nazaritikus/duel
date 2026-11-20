import { describe, expect, it } from 'vitest'
import { gameReducer, type GameState, type HostActionType } from '../../game'
import { startedGame } from '../../game/test-utils'
import { getPanelView } from './panelView'

const act = (s: GameState, type: HostActionType | 'pause' | 'check', now: number) =>
  gameReducer(s, { type, now })

describe('getPanelView', () => {
  it('tags the answering player «Перевірка» with a stopped time during a check', () => {
    const s = act(startedGame(0), 'check', 18_000)
    expect(getPanelView(s, 0, 30_000)).toEqual({
      tone: 'checking',
      label: 'Перевірка',
      time: '0:42',
      pct: 0.7,
    })
    expect(getPanelView(s, 1, 30_000)).toMatchObject({ tone: 'frozen', label: 'Заморожено' })
  })

  it('shows the answering player as active and the other as frozen', () => {
    const s = startedGame(0)
    expect(getPanelView(s, 0, 18_000)).toEqual({
      tone: 'active',
      label: 'Відповідає',
      time: '0:42',
      pct: 0.7,
    })
    expect(getPanelView(s, 1, 18_000)).toEqual({
      tone: 'frozen',
      label: 'Заморожено',
      time: '1:00',
      pct: 1,
    })
  })

  it('shows tenths and the last-seconds tone only for the active player under 10 s', () => {
    const s = startedGame(0, { timePerPlayerMs: 9_000 })
    expect(getPanelView(s, 0, 1_600)).toMatchObject({
      tone: 'last10',
      label: 'Останні секунди',
      time: '0:07.4',
    })
    // The frozen player is also under 10 s but shows whole seconds.
    expect(getPanelView(s, 1, 1_600)).toMatchObject({ tone: 'frozen', time: '0:09' })
  })

  it('marks correct feedback and the next player', () => {
    const s = act(startedGame(0), 'correct', 18_000)
    expect(getPanelView(s, 0, 19_000)).toMatchObject({
      tone: 'correct',
      label: 'Правильно',
      time: '0:42',
    })
    expect(getPanelView(s, 1, 19_000)).toMatchObject({ tone: 'next', label: 'Наступний хід' })
  })

  it('labels wrong and pass penalties while the time keeps running', () => {
    const wrong = act(startedGame(0), 'wrong', 18_000)
    expect(getPanelView(wrong, 0, 19_000)).toMatchObject({
      tone: 'wrong',
      label: 'Помилка · штраф',
      time: '0:41',
    })
    const pass = act(startedGame(0), 'pass', 18_000)
    expect(getPanelView(pass, 0, 20_000)).toMatchObject({
      tone: 'wrong',
      label: 'Пас · штраф',
      time: '0:40',
    })
    expect(getPanelView(pass, 1, 20_000)).toMatchObject({ tone: 'frozen' })
  })

  it('shows both players frozen while paused', () => {
    const s = act(startedGame(0), 'pause', 5_000)
    expect(getPanelView(s, 0, 9_000)).toMatchObject({ tone: 'frozen', time: '0:55' })
    expect(getPanelView(s, 1, 9_000)).toMatchObject({ tone: 'frozen', time: '1:00' })
  })
})
