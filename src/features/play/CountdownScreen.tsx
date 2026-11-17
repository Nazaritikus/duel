import { formatTime, getCountdownSeconds, getRemainingMs, type GameState } from '../../game'
import { PauseOverlay } from './GameScreen'
import type { PlayerNames } from './types'

interface CountdownScreenProps {
  state: GameState
  now: number
  categoryName: string
  names: PlayerNames
}

/** 3-2-1 before the first turn; also shown (with the pause overlay) if paused during it. */
export function CountdownScreen({ state, now, categoryName, names }: CountdownScreenProps) {
  const { phase } = state
  const countdown =
    phase.type === 'countdown'
      ? phase
      : phase.type === 'paused' && phase.resume.type === 'countdown'
        ? phase.resume
        : null
  if (!countdown) return null

  const starter = countdown.starter
  const seconds =
    phase.type === 'paused'
      ? Math.ceil((countdown.endsAt - phase.pausedAt) / 1000)
      : getCountdownSeconds(state, now)

  return (
    <div className={`countdown countdown--p${starter + 1}`} data-testid="countdown">
      <header className="game-header">
        <div className="game-header__logo">DUEL</div>
        <div className="game-header__info">
          Категорія: <span className="game-header__category">{categoryName}</span>
        </div>
      </header>
      <main className="countdown__center">
        <div className="countdown__kicker">Починає</div>
        <div className="countdown__name">{names[starter]}</div>
        <div className="countdown__ring" aria-live="polite">
          {seconds}
        </div>
      </main>
      <footer className="status-bar">
        {([0, 1] as const).map((p) => (
          <div key={p} className={`countdown-panel countdown-panel--p${p + 1}`}>
            <span className="panel__name">{names[p]}</span>
            <span className="panel__time">{formatTime(getRemainingMs(state, p, now))}</span>
          </div>
        ))}
      </footer>
      {phase.type === 'paused' && <PauseOverlay />}
    </div>
  )
}
