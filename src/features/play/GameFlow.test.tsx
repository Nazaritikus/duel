// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createTestClock } from '../../test/testClock'
import { GameFlow } from './GameFlow'
import { loadSetup } from './setupStorage'
import type { CategorySource, PlayCategory } from './types'

function category(id: string, name: string, count: number): PlayCategory {
  return {
    id,
    name,
    photos: Array.from({ length: count }, (_, i) => ({
      id: `${id}-${i}`,
      src: `/${id}-${i}.svg`,
      answerSrc: null,
      answer: `${name} ${i}`,
      isVertical: false,
    })),
  }
}

const CATALOG = [category('shapes', 'Фігури', 3), category('digits', 'Цифри', 10)]

const source: CategorySource = {
  listCategories: async () =>
    CATALOG.map((c) => ({ id: c.id, name: c.name, photoCount: c.photos.length })),
  loadCategory: async (id) => CATALOG.find((c) => c.id === id)!,
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

const key = (code: string) => fireEvent.keyDown(window, { code })

function renderFlow() {
  const t = createTestClock(0)
  const storage = memoryStorage()
  let seed = 100
  render(<GameFlow source={source} clock={t.clock} storage={storage} newSeed={() => seed++} />)
  return { t, storage }
}

async function startDuel(
  options: { names?: [string, string]; category?: RegExp; time?: string; penalty?: string } = {},
) {
  const { names = ['Назар', 'Олена'], category = /Цифри/, time, penalty } = options
  fireEvent.change(screen.getByRole('textbox', { name: 'Гравець 1' }), {
    target: { value: names[0] },
  })
  fireEvent.change(screen.getByRole('textbox', { name: 'Гравець 2' }), {
    target: { value: names[1] },
  })
  const grid = within(await screen.findByRole('group', { name: 'Категорії' }))
  fireEvent.click(grid.getByRole('radio', { name: category }))
  if (time) fireEvent.click(screen.getByRole('radio', { name: time }))
  if (penalty) fireEvent.click(screen.getByRole('radio', { name: penalty }))
  fireEvent.click(screen.getByRole('button', { name: /Почати дуель/ }))
  await screen.findByTestId('countdown')
}

describe('GameFlow', () => {
  it('runs setup → countdown → game → result → rematch → another category', async () => {
    const { t, storage } = renderFlow()
    await startDuel({ category: /Фігури/, time: '90\u00a0с' })

    expect(screen.getByText('Починає')).toBeInTheDocument()
    expect(screen.getAllByText('1:30')).toHaveLength(2)

    t.advance(3_000)
    expect(screen.getByTestId('game-header-info')).toHaveTextContent('Категорія: Фігури · фото 1')
    expect(within(screen.getByTestId('panel-1')).getByText('Назар')).toBeInTheDocument()

    // Three photos, all answered correctly: photos run out.
    for (let i = 0; i < 3; i++) {
      key('Enter')
      t.advance(2_000)
    }
    expect(screen.getByTestId('result')).toBeInTheDocument()
    expect(screen.getByText('Фігури · 3 фото')).toBeInTheDocument()

    // Settings were remembered on start.
    expect(loadSetup(storage)).toMatchObject({
      names: ['Назар', 'Олена'],
      categoryId: 'shapes',
      timePerPlayerMs: 90_000,
    })

    fireEvent.click(screen.getByRole('button', { name: 'Реванш' }))
    expect(screen.getByTestId('countdown')).toBeInTheDocument()
    expect(screen.getAllByText('Назар').length).toBeGreaterThan(0)
    expect(screen.getAllByText('1:30')).toHaveLength(2)

    // Enter on the result is also "Реванш".
    t.advance(3_000)
    for (let i = 0; i < 3; i++) {
      key('Enter')
      t.advance(2_000)
    }
    key('Enter')
    expect(screen.getByTestId('countdown')).toBeInTheDocument()

    t.advance(3_000)
    for (let i = 0; i < 3; i++) {
      key('Enter')
      t.advance(2_000)
    }
    fireEvent.click(screen.getByRole('button', { name: 'Інша категорія' }))
    expect(screen.getByRole('textbox', { name: 'Гравець 1' })).toHaveValue('Назар')
    expect(screen.getByRole('radio', { name: '90\u00a0с' })).toBeChecked()
  })

  it('uses "Гравець 2" for an empty name', async () => {
    renderFlow()
    await startDuel({ names: ['Назар', ''] })
    expect(screen.getAllByText('Гравець 2').length).toBeGreaterThan(0)
  })

  it('confirms exit with Esc → Enter and returns to setup with settings kept', async () => {
    const { t } = renderFlow()
    await startDuel({ penalty: '5\u00a0с' })
    t.advance(3_000)

    key('Escape')
    expect(screen.getByRole('alertdialog', { name: 'Вийти в меню?' })).toBeInTheDocument()
    key('Enter')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Гравець 2' })).toHaveValue('Олена')
    expect(screen.getByRole('radio', { name: '5\u00a0с' })).toBeChecked()
  })

  it('lets Enter press a focused dialog button instead of confirming the exit', async () => {
    const { t } = renderFlow()
    await startDuel()
    t.advance(3_000)
    key('Escape')
    expect(screen.getByRole('button', { name: /Вийти/ })).toHaveFocus()
    const keepPlaying = screen.getByRole('button', { name: /Продовжити гру/ })
    keepPlaying.focus()
    fireEvent.keyDown(keepPlaying, { code: 'Enter' })
    // The hotkey yielded; the browser's native activation is a click on the button.
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    fireEvent.click(keepPlaying)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByTestId('photo')).toBeInTheDocument()
  })

  it('focuses «Реванш» on the result screen', async () => {
    const { t } = renderFlow()
    await startDuel({ category: /Фігури/ })
    t.advance(3_000)
    for (let i = 0; i < 3; i++) {
      key('Enter')
      t.advance(2_000)
    }
    expect(screen.getByRole('button', { name: 'Реванш' })).toHaveFocus()
  })

  it('cancels exit with Esc and resumes with the same time', async () => {
    const { t } = renderFlow()
    await startDuel()
    t.advance(3_000)
    t.advance(10_000)
    expect(within(screen.getByTestId('panel-1')).getByText('0:50')).toBeInTheDocument()

    key('Escape')
    t.advance(30_000) // the dialog stays open for a while; clocks are stopped
    expect(within(screen.getByTestId('panel-1')).getByText('0:50')).toBeInTheDocument()
    key('Escape')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.queryByText('ПАУЗА')).not.toBeInTheDocument()
    t.advance(1_000)
    expect(within(screen.getByTestId('panel-1')).getByText('0:49')).toBeInTheDocument()
  })

  it('keeps an earlier pause when the exit is cancelled', async () => {
    const { t } = renderFlow()
    await startDuel()
    t.advance(3_000)
    key('Space')
    key('Escape')
    key('Escape')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByText('ПАУЗА')).toBeInTheDocument()
  })

  it('ignores judging keys while the exit dialog is open', async () => {
    const { t } = renderFlow()
    await startDuel()
    t.advance(3_000)
    key('Escape')
    key('KeyX')
    key('KeyP')
    key('Space')
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    key('Escape')
    expect(screen.getByTestId('panel-1')).toHaveAttribute('data-tone', 'active')
  })

  it('applies a 5 s penalty: "−5 с", next photo after 5 s, 20.0 → 15.0', async () => {
    const { t } = renderFlow()
    await startDuel({ penalty: '5\u00a0с', time: '45\u00a0с' })
    t.advance(3_000)
    t.advance(25_000) // 20.0 s left
    expect(within(screen.getByTestId('panel-1')).getByText('0:20')).toBeInTheDocument()

    key('KeyX')
    expect(screen.getByText('−5 с')).toBeInTheDocument()
    expect(screen.getByText('наступне фото через 5…')).toBeInTheDocument()
    t.advance(4_999)
    expect(screen.getByTestId('game-header-info')).toHaveTextContent('фото 1')
    t.advance(1)
    expect(screen.getByTestId('game-header-info')).toHaveTextContent('фото 2')
    expect(within(screen.getByTestId('panel-1')).getByText('0:15')).toBeInTheDocument()
  })

  it('checks the answer with Q: clocks stop, then X gives the usual penalty', async () => {
    const { t } = renderFlow()
    await startDuel({ time: '45\u00a0с' })
    t.advance(3_000)
    t.advance(25_000) // 20.0 s left
    key('KeyQ')
    expect(screen.getByTestId('panel-1')).toHaveAttribute('data-tone', 'checking')
    expect(screen.getByTestId('answer-bar')).toHaveTextContent(/Цифри \d/)
    t.advance(10_000)
    expect(within(screen.getByTestId('panel-1')).getByText('0:20')).toBeInTheDocument()
    key('KeyQ') // a second check changes nothing
    key('KeyX')
    expect(screen.getByText('−3 с')).toBeInTheDocument()
    t.advance(3_000)
    expect(screen.getByTestId('game-header-info')).toHaveTextContent('фото 2')
    expect(within(screen.getByTestId('panel-1')).getByText('0:17')).toBeInTheDocument()
  })

  it('shows an error and stays on setup when the category fails to load', async () => {
    const failing: CategorySource = {
      ...source,
      loadCategory: () => Promise.reject(new Error('x')),
    }
    render(<GameFlow source={failing} clock={createTestClock().clock} storage={memoryStorage()} />)
    const grid = within(await screen.findByRole('group', { name: 'Категорії' }))
    fireEvent.click(grid.getByRole('radio', { name: /Цифри/ }))
    fireEvent.click(screen.getByRole('button', { name: /Почати дуель/ }))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Не вдалося завантажити категорію'),
    )
  })
})
