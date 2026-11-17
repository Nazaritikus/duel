import { getRemainingMs, isLastSeconds, otherPlayer, type GameState } from '../../game'
import type { PlayerNames, PlayPhoto } from './types'

type Ring = 'p1' | 'p2' | 'correct' | 'wrong' | 'neutral'

function getRing(state: GameState, now: number): Ring {
  const { phase } = state
  if (phase.type === 'feedback') return phase.kind === 'correct' ? 'correct' : 'wrong'
  if (phase.type === 'turn') {
    if (isLastSeconds(getRemainingMs(state, phase.player, now))) return 'wrong'
    return phase.player === 0 ? 'p1' : 'p2'
  }
  return 'neutral'
}

interface PhotoFrameProps {
  state: GameState
  photo: PlayPhoto | undefined
  names: PlayerNames
  now: number
}

export function PhotoFrame({ state, photo, names, now }: PhotoFrameProps) {
  const { phase } = state
  const feedback = phase.type === 'feedback' ? phase : null
  // While paused the photo is not rendered at all, so it cannot be studied.
  const showPhoto = photo && phase.type !== 'paused'
  const src = feedback && photo?.answerSrc ? photo.answerSrc : photo?.src

  return (
    <div className={`photo-frame photo-frame--${getRing(state, now)}`} data-testid="photo-frame">
      {showPhoto && (
        <img
          className="photo-frame__img"
          src={src}
          alt={feedback ? photo.answer : 'Фото з категорії'}
          data-testid="photo"
        />
      )}

      {feedback && photo && (
        <>
          <div
            className={`photo-frame__tint photo-frame__tint--${feedback.kind === 'correct' ? 'correct' : 'wrong'}`}
          />
          <div className="answer-bar" data-testid="answer-bar">
            <div className="answer-bar__main">
              <div className="answer-bar__caption">Правильна відповідь</div>
              <div className="answer-bar__answer">{photo.answer}</div>
            </div>
            {feedback.kind === 'correct' ? (
              <div className="answer-bar__side">
                <svg
                  width="44"
                  height="44"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="answer-bar__check"
                >
                  <path d="M5 12l5 5L20 7" />
                </svg>
                <div className="answer-bar__hint">
                  Наступний хід: {names[otherPlayer(feedback.player)]}
                </div>
              </div>
            ) : (
              <div className="answer-bar__side">
                <div className="answer-bar__penalty">
                  −{Math.round(state.settings.penaltyMs / 1000)} с
                </div>
                <div className="answer-bar__hint">
                  наступне фото через {Math.max(1, Math.ceil((feedback.endsAt - now) / 1000))}…
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
