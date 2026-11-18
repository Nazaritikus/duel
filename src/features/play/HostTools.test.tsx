// @vitest-environment jsdom
import { act, fireEvent, render, renderHook, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createTestClock } from '../../test/testClock'
import { GameFlow } from './GameFlow'
import type { SoundEngine } from './sound/synth'
import type { CategorySource, PlayCategory } from './types'
import { useFullscreen } from './useFullscreen'
import { appHotkeyFor } from './useHostHotkeys'

const CATEGORY: PlayCategory = {
  id: 'cars',
  name: 'Авто',
  photos: Array.from({ length: 6 }, (_, i) => ({
    id: `p${i}`,
    src: `/p${i}.webp`,
    answerSrc: null,
    answer: `Авто ${i}`,
    isVertical: false,
  })),
}

const source: CategorySource = {
  listCategories: async () => [{ id: 'cars', name: 'Авто', photoCount: 6 }],
  loadCategory: async () => CATEGORY,
}

function memoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, v),
  }
}

function renderFlow(storage = memoryStorage()) {
  const t = createTestClock(0)
  const engine = { unlock: vi.fn(), play: vi.fn() } satisfies SoundEngine
  const utils = render(
    <GameFlow
      source={source}
      clock={t.clock}
      storage={storage}
      newSeed={() => 7}
      soundEngine={engine}
    />,
  )
  return { t, engine, storage, ...utils }
}

async function startGame(t: ReturnType<typeof createTestClock>) {
  const grid = within(await screen.findByRole('group', { name: 'Категорії' }))
  fireEvent.click(grid.getByRole('radio', { name: /Авто/ }))
  fireEvent.click(screen.getByRole('button', { name: /Почати дуель/ }))
  await screen.findByTestId('countdown')
  t.advance(3_000)
  t.advance(16)
}

const key = (code: string, target: Window | Element = window) => fireEvent.keyDown(target, { code })

describe('sounds', () => {
  it('unlocks audio on the first gesture and plays the correct chime once', async () => {
    const { t, engine } = renderFlow()
    await startGame(t)
    expect(engine.unlock).not.toHaveBeenCalled()
    key('Enter')
    expect(engine.unlock).toHaveBeenCalled()
    t.advance(16)
    t.advance(16)
    expect(engine.play.mock.calls).toEqual([['correct']])
  })

  it('plays nothing while muted with M and shows it in the header', async () => {
    const { t, engine, storage } = renderFlow()
    await startGame(t)
    key('KeyM')
    t.advance(16)
    expect(screen.getByText('Звук вимкнено')).toBeInTheDocument()
    key('KeyX')
    t.advance(16)
    expect(engine.play).not.toHaveBeenCalled()
    expect(JSON.parse(storage.getItem('duel.sound.v1')!)).toEqual({ muted: true })
  })

  it('remembers mute across reloads and toggles it on the setup screen', async () => {
    const storage = memoryStorage()
    storage.setItem('duel.sound.v1', JSON.stringify({ muted: true }))
    renderFlow(storage)
    const toggle = await screen.findByRole('button', { name: 'Звук: вимк.' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(toggle)
    expect(screen.getByRole('button', { name: 'Звук: увімк.' })).toBeInTheDocument()
    expect(JSON.parse(storage.getItem('duel.sound.v1')!)).toEqual({ muted: false })
  })
})

describe('host help', () => {
  it('opens with the steps and hotkeys and closes with Esc, keeping the entries', async () => {
    renderFlow()
    fireEvent.change(screen.getByRole('textbox', { name: 'Гравець 1' }), {
      target: { value: 'Назар' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Як провести гру' }))
    const dialog = screen.getByRole('dialog', { name: 'Як провести гру' })
    expect(dialog).toHaveTextContent('Поділитися звуком вкладки')
    expect(within(dialog).getByText('Пас')).toBeInTheDocument()
    expect(within(dialog).getByText('На весь екран')).toBeInTheDocument()
    key('Escape')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Гравець 1' })).toHaveValue('Назар')
  })

  it('makes the setup form inert while open and returns focus to the trigger', async () => {
    renderFlow()
    const trigger = screen.getByRole('button', { name: 'Як провести гру' })
    trigger.focus()
    fireEvent.click(trigger)
    expect(screen.getByRole('textbox', { name: 'Гравець 1' }).closest('[inert]')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Закрити' })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Закрити' }))
    expect(screen.getByRole('textbox', { name: 'Гравець 1' }).closest('[inert]')).toBeNull()
    expect(screen.getByRole('button', { name: 'Як провести гру' })).toHaveFocus()

    fireEvent.click(screen.getByRole('button', { name: 'Як провести гру' }))
    key('Escape')
    expect(screen.getByRole('button', { name: 'Як провести гру' })).toHaveFocus()
  })

  it('makes the game inert behind the exit dialog', async () => {
    const { t } = renderFlow()
    await startGame(t)
    key('Escape')
    expect(screen.getByTestId('photo-frame').closest('[inert]')).not.toBeNull()
    key('Escape')
    expect(screen.getByTestId('photo-frame').closest('[inert]')).toBeNull()
  })

  it('lists the hotkeys on the pause overlay', async () => {
    const { t } = renderFlow()
    await startGame(t)
    key('Space')
    t.advance(16)
    const overlay = screen.getByText('ПАУЗА').parentElement!
    expect(within(overlay).getByText('Помилка')).toBeInTheDocument()
    expect(within(overlay).getByText('Пауза / продовжити')).toBeInTheDocument()
  })
})

describe('app hotkeys', () => {
  it('maps F and M, never while typing', () => {
    const ev = (code: string, target?: EventTarget) => {
      const e = new KeyboardEvent('keydown', { code })
      if (target) Object.defineProperty(e, 'target', { value: target })
      return e
    }
    expect(appHotkeyFor(ev('KeyF'))).toBe('fullscreen')
    expect(appHotkeyFor(ev('KeyM'))).toBe('mute')
    expect(appHotkeyFor(ev('KeyX'))).toBeNull()
    expect(appHotkeyFor(ev('KeyF', document.createElement('input')))).toBeNull()
  })
})

describe('useFullscreen', () => {
  function fakeDocument(refuse = false) {
    const listeners = new Set<() => void>()
    const doc = {
      fullscreenEnabled: true,
      fullscreenElement: null as Element | null,
      documentElement: {
        requestFullscreen: vi.fn(async () => {
          if (refuse) throw new Error('denied')
          doc.fullscreenElement = {} as Element
          listeners.forEach((l) => l())
        }),
      },
      exitFullscreen: vi.fn(async () => {
        doc.fullscreenElement = null
        listeners.forEach((l) => l())
      }),
      addEventListener: (_: string, l: () => void) => listeners.add(l),
      removeEventListener: (_: string, l: () => void) => listeners.delete(l),
    }
    return doc
  }

  it('enters and leaves fullscreen', async () => {
    const doc = fakeDocument()
    const { result } = renderHook(() => useFullscreen(doc as unknown as Document))
    expect(result.current.supported).toBe(true)
    await act(async () => result.current.toggle())
    expect(result.current.active).toBe(true)
    await act(async () => result.current.toggle())
    expect(doc.exitFullscreen).toHaveBeenCalled()
    expect(result.current.active).toBe(false)
  })

  it('ignores a refused request', async () => {
    const doc = fakeDocument(true)
    const { result } = renderHook(() => useFullscreen(doc as unknown as Document))
    await act(async () => result.current.toggle())
    expect(result.current.active).toBe(false)
  })
})
