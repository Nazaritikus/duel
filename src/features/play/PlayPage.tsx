import { useCallback, useEffect, useMemo, useState } from 'react'
import { GameScreen } from './GameScreen'
import { InterimCountdown, InterimResult } from './InterimViews'
import { loadMockCategory } from './mockCategory'
import { Stage } from './Stage'
import type { PlayCategory, PlayerNames } from './types'
import { browserClock, useGame, type FrameClock } from './useGame'
import { useHostHotkeys } from './useHostHotkeys'
import './play.css'

const DEFAULT_NAMES: PlayerNames = ['Гравець 1', 'Гравець 2']

interface PlayGameProps {
  category: PlayCategory
  names: PlayerNames
  seed: number
  clock: FrameClock
  onRestart: () => void
}

function PlayGame({ category, names, seed, clock, onRestart }: PlayGameProps) {
  const photoIds = useMemo(() => category.photos.map((p) => p.id), [category])
  const photosById = useMemo(() => new Map(category.photos.map((p) => [p.id, p])), [category])
  const { state, now, command } = useGame({ photoIds, seed, clock })

  useHostHotkeys((hotkey) => {
    if (state.phase.type === 'finished') {
      if (hotkey === 'correct') onRestart()
      return
    }
    if (hotkey === 'togglePause') command(state.phase.type === 'paused' ? 'resume' : 'pause')
    else command(hotkey)
  })

  if (state.phase.type === 'countdown') {
    return <InterimCountdown state={state} now={now} names={names} />
  }
  if (state.phase.type === 'finished') return <InterimResult state={state} names={names} />
  return (
    <GameScreen state={state} now={now} category={category} photosById={photosById} names={names} />
  )
}

type Load =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; category: PlayCategory }

interface PlayPageProps {
  loadCategory?: () => Promise<PlayCategory>
  clock?: FrameClock
  names?: PlayerNames
  initialSeed?: number
}

export function PlayPage({
  loadCategory = loadMockCategory,
  clock = browserClock,
  names = DEFAULT_NAMES,
  initialSeed,
}: PlayPageProps) {
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [seed, setSeed] = useState(() => initialSeed ?? Date.now())

  useEffect(() => {
    let cancelled = false
    loadCategory().then(
      (category) => !cancelled && setLoad({ status: 'ready', category }),
      () => !cancelled && setLoad({ status: 'error' }),
    )
    return () => {
      cancelled = true
    }
  }, [loadCategory, attempt])

  const restart = useCallback(() => setSeed((s) => s + 1), [])

  return (
    <Stage>
      {load.status === 'loading' && <div className="interim">Завантаження…</div>}
      {load.status === 'error' && (
        <div className="interim">
          <div className="interim__caption">Не вдалося завантажити категорію</div>
          <button
            className="interim__button"
            onClick={() => {
              setLoad({ status: 'loading' })
              setAttempt((a) => a + 1)
            }}
          >
            Спробувати ще
          </button>
        </div>
      )}
      {load.status === 'ready' && (
        <PlayGame
          key={seed}
          category={load.category}
          names={names}
          seed={seed}
          clock={clock}
          onRestart={restart}
        />
      )}
    </Stage>
  )
}
