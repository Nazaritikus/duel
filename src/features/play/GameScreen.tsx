import { getCurrentPhotoId, type GameState } from '../../game'
import { HotkeyList } from './HotkeyList'
import { PhotoFrame } from './PhotoFrame'
import { StatusBar } from './StatusBar'
import type { PlayCategory, PlayerNames, PlayPhoto } from './types'

export function GameHeader({
  categoryName,
  photoNumber,
  muted = false,
}: {
  categoryName: string
  photoNumber: number
  muted?: boolean
}) {
  return (
    <header className="game-header">
      <div className="game-header__logo">DUEL</div>
      {muted && <div className="game-header__muted">Звук вимкнено</div>}
      <div className="game-header__info" data-testid="game-header-info">
        Категорія: <span className="game-header__category">{categoryName}</span> · фото{' '}
        {photoNumber}
      </div>
    </header>
  )
}

export function PauseOverlay() {
  return (
    <div className="pause-overlay" role="status">
      <svg
        width="72"
        height="72"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M9 6v12M15 6v12" />
      </svg>
      <div className="pause-overlay__title">ПАУЗА</div>
      <div className="pause-overlay__hint">Годинники обох гравців зупинені · фото приховано</div>
      <HotkeyList compact />
    </div>
  )
}

interface GameScreenProps {
  state: GameState
  now: number
  category: PlayCategory
  photosById: ReadonlyMap<string, PlayPhoto>
  names: PlayerNames
  muted?: boolean
}

export function GameScreen({
  state,
  now,
  category,
  photosById,
  names,
  muted = false,
}: GameScreenProps) {
  const photoId = getCurrentPhotoId(state)
  const photo = photoId === undefined ? undefined : photosById.get(photoId)

  return (
    <div className="game-screen">
      <GameHeader categoryName={category.name} photoNumber={state.photoIndex + 1} muted={muted} />
      <main className="game-screen__photo-area">
        <PhotoFrame state={state} photo={photo} names={names} now={now} />
      </main>
      <StatusBar state={state} names={names} now={now} />
      {state.phase.type === 'paused' && <PauseOverlay />}
    </div>
  )
}
