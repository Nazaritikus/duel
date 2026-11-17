import {
  formatTime,
  getRemainingMs,
  isLastSeconds,
  type GameState,
  type PlayerIndex,
} from '../../game'

export type PanelTone = 'active' | 'last10' | 'frozen' | 'correct' | 'next' | 'wrong'

export interface PanelView {
  tone: PanelTone
  label: string
  time: string
  /** Remaining share of the starting time, 0..1. */
  pct: number
}

/** Who the current turn or feedback belongs to, if anyone. */
export function getOwner(state: GameState): PlayerIndex | null {
  const { phase } = state
  return phase.type === 'turn' || phase.type === 'feedback' ? phase.player : null
}

export function getPanelView(state: GameState, player: PlayerIndex, now: number): PanelView {
  const remaining = getRemainingMs(state, player, now)
  const pct = Math.max(0, Math.min(1, remaining / state.settings.timePerPlayerMs))
  const owner = getOwner(state)
  const isOwner = owner === player
  const time = formatTime(remaining, { tenths: isOwner && isLastSeconds(remaining) })
  const { phase } = state

  if (phase.type === 'turn' && isOwner) {
    return isLastSeconds(remaining)
      ? { tone: 'last10', label: 'Останні секунди', time, pct }
      : { tone: 'active', label: 'Відповідає', time, pct }
  }

  if (phase.type === 'feedback') {
    if (phase.kind === 'correct') {
      return isOwner
        ? { tone: 'correct', label: 'Правильно', time, pct }
        : { tone: 'next', label: 'Наступний хід', time, pct }
    }
    if (isOwner) {
      const label = phase.kind === 'pass' ? 'Пас · штраф' : 'Помилка · штраф'
      return { tone: 'wrong', label, time, pct }
    }
  }

  return { tone: 'frozen', label: 'Заморожено', time, pct }
}
