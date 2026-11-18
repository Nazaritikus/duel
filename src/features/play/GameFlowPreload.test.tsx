// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createGame } from '../../game'
import { createTestClock } from '../../test/testClock'
import { GameFlow } from './GameFlow'
import type { ImagePreloader } from './imagePreloader'
import type { CategorySource, PlayCategory } from './types'

const CATEGORY: PlayCategory = {
  id: 'cars',
  name: 'Авто',
  photos: Array.from({ length: 8 }, (_, i) => ({
    id: `p${i}`,
    src: `/p${i}.webp`,
    answerSrc: i % 2 === 0 ? `/p${i}.answer.webp` : null,
    answer: `Авто ${i}`,
    isVertical: false,
  })),
}

const source = (load: CategorySource['loadCategory'] = async () => CATEGORY): CategorySource => ({
  listCategories: async () => [{ id: 'cars', name: 'Авто', photoCount: 8 }],
  loadCategory: load,
})

const SEED = 42
const order = createGame({
  photoIds: CATEGORY.photos.map((p) => p.id),
  now: 0,
  seed: SEED,
}).photoIds
const srcs = (ids: readonly string[]) =>
  ids.flatMap((id) => {
    const p = CATEGORY.photos.find((x) => x.id === id)!
    return p.answerSrc ? [p.src, p.answerSrc] : [p.src]
  })

function deferredPreloader() {
  const pending: (() => void)[] = []
  const preloader: ImagePreloader & { preload: ReturnType<typeof vi.fn> } = {
    preload: vi.fn(
      () =>
        new Promise<void>((resolve) => {
          pending.push(resolve)
        }),
    ),
  }
  return { preloader, resolveAll: () => pending.splice(0).forEach((r) => r()) }
}

function renderFlow(preloader: ImagePreloader, src = source()) {
  const t = createTestClock(0)
  render(<GameFlow source={src} clock={t.clock} newSeed={() => SEED} preloader={preloader} />)
  return t
}

async function clickStart() {
  const grid = within(await screen.findByRole('group', { name: 'Категорії' }))
  fireEvent.click(grid.getByRole('radio', { name: /Авто/ }))
  fireEvent.click(screen.getByRole('button', { name: /Почати дуель/ }))
}

describe('GameFlow preloading', () => {
  it('decodes the first three photos of the seeded order before the countdown', async () => {
    const { preloader, resolveAll } = deferredPreloader()
    renderFlow(preloader)
    await clickStart()

    await vi.waitFor(() => expect(preloader.preload).toHaveBeenCalled())
    expect(preloader.preload.mock.calls.map(([s]) => s)).toEqual(srcs(order.slice(0, 3)))
    expect(screen.getByRole('button', { name: /Завантаження/ })).toBeInTheDocument()
    expect(screen.queryByTestId('countdown')).not.toBeInTheDocument()

    await act(async () => resolveAll())
    expect(await screen.findByTestId('countdown')).toBeInTheDocument()
  })

  it('preloads ahead as the game moves to the next photo', async () => {
    const preloader = {
      preload: vi.fn(async (_src: string, _options?: { priority?: string }) => {}),
    }
    const t = renderFlow(preloader)
    await clickStart()
    await screen.findByTestId('countdown')
    expect(preloader.preload.mock.calls.map(([s]) => s)).toContain(srcs([order[3]])[0])

    t.advance(3_000) // countdown over
    preloader.preload.mockClear()
    fireEvent.keyDown(window, { code: 'Enter' }) // correct → feedback
    t.advance(2_100) // feedback over → next photo
    t.advance(16)
    expect(preloader.preload.mock.calls.map(([s]) => s)).toEqual(srcs(order.slice(1, 5)))
    // The photo on screen keeps normal priority; look-ahead photos are fetched with low priority.
    const priority = new Map(preloader.preload.mock.calls.map(([src, o]) => [src, o?.priority]))
    expect(srcs([order[1]]).map((src) => priority.get(src))).toEqual(
      srcs([order[1]]).map(() => undefined),
    )
    expect(new Set(srcs(order.slice(2, 5)).map((src) => priority.get(src)))).toEqual(
      new Set(['low']),
    )
  })

  it('starts anyway when preloading fails', async () => {
    const preloader = { preload: vi.fn(async () => Promise.reject(new Error('offline'))) }
    renderFlow(preloader)
    await clickStart()
    expect(await screen.findByTestId('countdown')).toBeInTheDocument()
  })

  it('stays on setup with an error when the category cannot be loaded', async () => {
    const preloader = {
      preload: vi.fn(async (_src: string, _options?: { priority?: string }) => {}),
    }
    renderFlow(
      preloader,
      source(async () => {
        throw new Error('down')
      }),
    )
    await clickStart()
    expect(await screen.findByRole('alert')).toHaveTextContent('Не вдалося завантажити категорію')
    expect(preloader.preload).not.toHaveBeenCalled()
  })
})
