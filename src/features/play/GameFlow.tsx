import { useCallback, useEffect, useMemo, useState } from 'react'
import { CountdownScreen } from './CountdownScreen'
import { ExitConfirm } from './ExitConfirm'
import { GameScreen } from './GameScreen'
import { ResultScreen } from './ResultScreen'
import { SetupScreen, type CategoryList } from './SetupScreen'
import { displayNames, loadSetup, saveSetup, type GameSetup } from './setupStorage'
import { Stage } from './Stage'
import type { CategorySource, PlayCategory } from './types'
import { browserClock, useGame, type FrameClock } from './useGame'
import { useHostHotkeys, type HostHotkey } from './useHostHotkeys'
import './play.css'
import './flow.css'

interface ActiveGameProps {
  category: PlayCategory
  setup: GameSetup
  seed: number
  clock: FrameClock
  onRematch: () => void
  onExit: () => void
}

/** One duel: countdown → game → result, plus the Esc exit confirmation. */
function ActiveGame({ category, setup, seed, clock, onRematch, onExit }: ActiveGameProps) {
  const names = useMemo(() => displayNames(setup), [setup])
  const photoIds = useMemo(() => category.photos.map((p) => p.id), [category])
  const photosById = useMemo(() => new Map(category.photos.map((p) => [p.id, p])), [category])
  const settings = useMemo(
    () => ({
      timePerPlayerMs: setup.timePerPlayerMs,
      penaltyMs: setup.penaltyMs,
      firstPlayer: setup.firstPlayer,
    }),
    [setup],
  )
  const { state, now, command } = useGame({ photoIds, seed, settings, clock })
  // null: closed; otherwise whether this dialog paused the game (and so must resume it).
  const [confirm, setConfirm] = useState<{ pausedByDialog: boolean } | null>(null)
  const { phase } = state

  const cancelExit = () => {
    if (confirm?.pausedByDialog) command('resume')
    setConfirm(null)
  }

  useHostHotkeys((hotkey: HostHotkey) => {
    if (confirm) {
      if (hotkey === 'correct') onExit()
      else if (hotkey === 'exit') cancelExit()
      return
    }
    if (phase.type === 'finished') {
      if (hotkey === 'correct') onRematch()
      return
    }
    switch (hotkey) {
      case 'exit': {
        const alreadyPaused = phase.type === 'paused'
        if (!alreadyPaused) command('pause')
        setConfirm({ pausedByDialog: !alreadyPaused })
        return
      }
      case 'togglePause':
        command(phase.type === 'paused' ? 'resume' : 'pause')
        return
      default:
        command(hotkey)
    }
  })

  const inCountdown =
    phase.type === 'countdown' || (phase.type === 'paused' && phase.resume.type === 'countdown')

  let screen
  if (inCountdown) {
    screen = <CountdownScreen state={state} now={now} categoryName={category.name} names={names} />
  } else if (phase.type === 'finished') {
    screen = (
      <ResultScreen
        state={state}
        categoryName={category.name}
        names={names}
        onRematch={onRematch}
        onOtherCategory={onExit}
      />
    )
  } else {
    screen = (
      <GameScreen
        state={state}
        now={now}
        category={category}
        photosById={photosById}
        names={names}
      />
    )
  }

  return (
    <>
      {screen}
      {confirm && <ExitConfirm onConfirm={onExit} onCancel={cancelExit} />}
    </>
  )
}

type Flow =
  { screen: 'setup' } | { screen: 'game'; setup: GameSetup; category: PlayCategory; seed: number }

interface GameFlowProps {
  source: CategorySource
  clock?: FrameClock
  storage?: Storage
  newSeed?: () => number
}

const randomSeed = () => Math.floor(Math.random() * 2 ** 31)

/** The whole host flow on `/`: setup → countdown → game → result → rematch / other category. */
export function GameFlow({
  source,
  clock = browserClock,
  storage,
  newSeed = randomSeed,
}: GameFlowProps) {
  const [flow, setFlow] = useState<Flow>({ screen: 'setup' })
  const [lastSetup, setLastSetup] = useState<GameSetup>(() => loadSetup(storage))
  const [categories, setCategories] = useState<CategoryList>({ status: 'loading' })
  const [listAttempt, setListAttempt] = useState(0)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState(false)

  useEffect(() => {
    let cancelled = false
    source.listCategories().then(
      (list) => !cancelled && setCategories({ status: 'ready', categories: list }),
      () => !cancelled && setCategories({ status: 'error' }),
    )
    return () => {
      cancelled = true
    }
  }, [source, listAttempt])

  const start = (setup: GameSetup) => {
    if (!setup.categoryId) return
    setStarting(true)
    setStartError(false)
    setLastSetup(setup)
    saveSetup(setup, storage)
    source.loadCategory(setup.categoryId).then(
      (category) => {
        setStarting(false)
        setFlow({ screen: 'game', setup, category, seed: newSeed() })
      },
      () => {
        setStarting(false)
        setStartError(true)
      },
    )
  }

  const rematch = useCallback(
    () => setFlow((f) => (f.screen === 'game' ? { ...f, seed: newSeed() } : f)),
    [newSeed],
  )
  const backToSetup = useCallback(() => setFlow({ screen: 'setup' }), [])

  return (
    <Stage>
      {flow.screen === 'setup' ? (
        <SetupScreen
          initial={lastSetup}
          categories={categories}
          starting={starting}
          startError={startError}
          onRetryList={() => {
            setCategories({ status: 'loading' })
            setListAttempt((a) => a + 1)
          }}
          onStart={start}
        />
      ) : (
        <ActiveGame
          key={flow.seed}
          category={flow.category}
          setup={flow.setup}
          seed={flow.seed}
          clock={clock}
          onRematch={rematch}
          onExit={backToSetup}
        />
      )}
    </Stage>
  )
}
