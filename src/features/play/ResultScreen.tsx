import { useEffect, useRef } from 'react'
import { formatTime, getRemainingMs, isLastSeconds, type GameState } from '../../game'
import { pluralUk } from './pluralUk'
import type { PlayerNames } from './types'

interface ResultScreenProps {
  state: GameState
  categoryName: string
  names: PlayerNames
  onRematch: () => void
  onOtherCategory: () => void
}

const STAT_FORMS = {
  correct: ['правильно', 'правильно', 'правильно'],
  wrong: ['помилка', 'помилки', 'помилок'],
  pass: ['пас', 'паси', 'пасів'],
} as const

export function ResultScreen({
  state,
  categoryName,
  names,
  onRematch,
  onOtherCategory,
}: ResultScreenProps) {
  // Focus on «Реванш» so Enter presses it natively (hotkeys yield to focused buttons).
  const rematchRef = useRef<HTMLButtonElement>(null)
  const finished = state.phase.type === 'finished'
  useEffect(() => {
    if (finished) rematchRef.current?.focus()
  }, [finished])

  const { phase } = state
  if (phase.type !== 'finished') return null
  const { winner, reason, at } = phase

  const photosShown = Math.min(state.photoIndex + 1, state.photoIds.length)
  let kicker: string
  let headline: string
  let reasonLine: string
  if (winner === null) {
    kicker = 'Фото закінчились'
    headline = 'Нічия'
    reasonLine = 'Однаковий час у обох'
  } else {
    const left = getRemainingMs(state, winner, at)
    const time = formatTime(left, { tenths: isLastSeconds(left) })
    kicker = 'Перемога'
    headline = names[winner]
    reasonLine = `${reason === 'timeout' ? 'Час суперника вичерпано' : 'Фото закінчились'} · залишилось `
    reasonLine += time
  }

  return (
    <div className="result" data-testid="result">
      <header className="result__header">
        <div className="game-header__logo" translate="no">
          DUEL
        </div>
        <div className="result__meta">
          {categoryName} · {`${photosShown}\u00a0фото`}
        </div>
      </header>

      <div className="result__hero">
        <div
          className={`result__kicker ${winner === null ? '' : `result__kicker--p${winner + 1}`}`}
        >
          {kicker}
        </div>
        <div
          className={`result__headline ${winner === null ? '' : `result__headline--p${winner + 1}`}`}
          // The headline is a player's name unless it is a draw.
          translate={winner === null ? undefined : 'no'}
        >
          {headline}
        </div>
        <div className="result__reason">{reasonLine}</div>
      </div>

      <div className="result__cards">
        {([0, 1] as const).map((p) => {
          const stats = state.stats[p]
          const isWinner = winner === p
          return (
            <section
              key={p}
              className={`result-card result-card--p${p + 1} ${isWinner ? 'result-card--winner' : ''}`}
              aria-label={names[p]}
            >
              <div className="result-card__name" translate="no">
                {names[p]}
              </div>
              <div className="result-card__stats">
                {(['correct', 'wrong', 'pass'] as const).map((kind) => (
                  <div key={kind} className={`stat stat--${kind}`}>
                    <span className="stat__value">{stats[kind]}</span>
                    <span className="stat__label">{pluralUk(stats[kind], STAT_FORMS[kind])}</span>
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </div>

      <div className="result__actions">
        <button type="button" className="secondary-button" onClick={onOtherCategory}>
          Інша категорія
        </button>
        <button ref={rematchRef} type="button" className="primary-button" onClick={onRematch}>
          Реванш
        </button>
      </div>
    </div>
  )
}
