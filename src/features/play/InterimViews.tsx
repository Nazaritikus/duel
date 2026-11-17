// Interim, non-normative views so /play runs end to end; phase 4 replaces them with the
// designed Countdown and Result screens.
import { getCountdownSeconds, type GameState } from '../../game'
import type { PlayerNames } from './types'

export function InterimCountdown({
  state,
  now,
  names,
}: {
  state: GameState
  now: number
  names: PlayerNames
}) {
  if (state.phase.type !== 'countdown') return null
  return (
    <div className="interim" data-testid="interim-countdown">
      <div className="interim__caption">Починає: {names[state.phase.starter]}</div>
      <div className="interim__number">{getCountdownSeconds(state, now)}</div>
    </div>
  )
}

const REASONS = {
  timeout: 'Час суперника вичерпано',
  photos_exhausted: 'Фото закінчились',
} as const

export function InterimResult({ state, names }: { state: GameState; names: PlayerNames }) {
  if (state.phase.type !== 'finished') return null
  const { winner, reason } = state.phase
  return (
    <div className="interim" data-testid="interim-result">
      <div className="interim__title">
        {winner === null ? 'Нічия' : `Перемога: ${names[winner]}`}
      </div>
      <div className="interim__caption">{REASONS[reason]}</div>
      <table className="interim__stats">
        <thead>
          <tr>
            <th />
            <th>Правильно</th>
            <th>Помилка</th>
            <th>Пас</th>
          </tr>
        </thead>
        <tbody>
          {([0, 1] as const).map((p) => (
            <tr key={p}>
              <th>{names[p]}</th>
              <td>{state.stats[p].correct}</td>
              <td>{state.stats[p].wrong}</td>
              <td>{state.stats[p].pass}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="interim__hint">Enter — нова гра</div>
    </div>
  )
}
