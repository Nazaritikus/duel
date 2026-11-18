import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createGame } from '../../game'
import { CountdownScreen } from './CountdownScreen'
import { ExitConfirm } from './ExitConfirm'
import { createImagePreloader, type ImagePreloader } from './imagePreloader'
import { upcomingSources } from './preloadPlan'
import { cuesBetween, type Frame } from './sound/cues'
import { loadMuted, saveMuted } from './sound/muteStorage'
import { defaultSoundEngine, type SoundEngine } from './sound/synth'
import { useFullscreen } from './useFullscreen'
import { GameScreen } from './GameScreen'
import { ResultScreen } from './ResultScreen'
import { SetupScreen, type CategoryList } from './SetupScreen'
import { displayNames, loadSetup, saveSetup, type GameSetup } from './setupStorage'
import { Stage } from './Stage'
import type { CategorySource, PlayCategory } from './types'
import { browserClock, useGame, type FrameClock } from './useGame'
import { useAppHotkeys, useHostHotkeys, type HostHotkey } from './useHostHotkeys'
import './play.css'
import './flow.css'

/** Photos ahead of the current one to keep decoded (spec: game-ui / Preloading). */
const PRELOAD_AHEAD = 3
/** Photos decoded before the countdown, and how long the start may wait for them. */
const START_PHOTOS = 3
const START_PRELOAD_TIMEOUT_MS = 8000

const noopPreloader: ImagePreloader = { preload: () => Promise.resolve() }

/** jsdom has no image decoding; there (and in old browsers) preloading is skipped. */
function defaultPreloader(): ImagePreloader {
  return typeof HTMLImageElement !== 'undefined' && 'decode' in HTMLImageElement.prototype
    ? createImagePreloader()
    : noopPreloader
}

function preloadAll(
  preloader: ImagePreloader,
  sources: readonly string[],
  priority?: 'high' | 'low' | 'auto',
) {
  return Promise.allSettled(sources.map((src) => preloader.preload(src, { priority })))
}

/** Plays the cues for each rendered frame; the previous frame advances even while muted. */
function useGameSounds(frame: Frame, engine: SoundEngine, muted: boolean) {
  const prev = useRef<Frame | null>(null)
  useEffect(() => {
    const cues = cuesBetween(prev.current, frame)
    prev.current = frame
    if (!muted) for (const cue of cues) engine.play(cue)
  }, [frame, engine, muted])
}

interface ActiveGameProps {
  category: PlayCategory
  setup: GameSetup
  seed: number
  clock: FrameClock
  preloader: ImagePreloader
  sound: SoundEngine
  muted: boolean
  onRematch: () => void
  onExit: () => void
}

/** One duel: countdown → game → result, plus the Esc exit confirmation. */
function ActiveGame({
  category,
  setup,
  seed,
  clock,
  preloader,
  sound,
  muted,
  onRematch,
  onExit,
}: ActiveGameProps) {
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

  const frame = useMemo(() => ({ state, now }), [state, now])
  useGameSounds(frame, sound, muted)

  const order = state.photoIds
  const photoIndex = state.photoIndex
  useEffect(() => {
    // The photo on screen first at normal priority; look-ahead photos must not compete with it.
    void preloadAll(preloader, upcomingSources(order, photoIndex, photosById, 0))
    void preloadAll(
      preloader,
      upcomingSources(order, photoIndex + 1, photosById, PRELOAD_AHEAD - 1),
      'low',
    )
  }, [preloader, order, photoIndex, photosById])
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
        muted={muted}
      />
    )
  }

  return (
    <>
      {/* While the exit dialog is open the game behind it cannot take focus. */}
      <div className="inert-scope" inert={confirm !== null}>
        {screen}
      </div>
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
  preloader?: ImagePreloader
  soundEngine?: SoundEngine
}

const randomSeed = () => Math.floor(Math.random() * 2 ** 31)

/** The whole host flow on `/`: setup → countdown → game → result → rematch / other category. */
export function GameFlow({
  source,
  clock = browserClock,
  storage,
  newSeed = randomSeed,
  preloader: preloaderProp,
  soundEngine,
}: GameFlowProps) {
  const [preloader] = useState(() => preloaderProp ?? defaultPreloader())
  const [sound] = useState(() => soundEngine ?? defaultSoundEngine())
  const [muted, setMuted] = useState(() => loadMuted(storage))
  const fullscreen = useFullscreen()

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      saveMuted(!m, storage)
      return !m
    })
  }, [storage])

  useAppHotkeys((hotkey) => (hotkey === 'mute' ? toggleMute() : fullscreen.toggle()))

  // Browsers only start audio from a user gesture: unlock on the first click or key press.
  useEffect(() => {
    const unlock = () => sound.unlock()
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
  }, [sound])
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
      async (category) => {
        // Decode the first photos of exactly the order this seed will produce.
        const seed = newSeed()
        const order = createGame({
          photoIds: category.photos.map((p) => p.id),
          now: 0,
          seed,
        }).photoIds
        const byId = new Map(category.photos.map((p) => [p.id, p]))
        await Promise.race([
          preloadAll(preloader, upcomingSources(order, 0, byId, START_PHOTOS - 1)),
          new Promise((resolve) => setTimeout(resolve, START_PRELOAD_TIMEOUT_MS)),
        ])
        setStarting(false)
        setFlow({ screen: 'game', setup, category, seed })
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
          muted={muted}
          onToggleMute={toggleMute}
          fullscreen={fullscreen}
        />
      ) : (
        <ActiveGame
          key={flow.seed}
          category={flow.category}
          setup={flow.setup}
          seed={flow.seed}
          clock={clock}
          preloader={preloader}
          sound={sound}
          muted={muted}
          onRematch={rematch}
          onExit={backToSetup}
        />
      )}
    </Stage>
  )
}
