// @vitest-environment jsdom
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SetupScreen, type CategoryList } from './SetupScreen'
import { DEFAULT_SETUP, type GameSetup } from './setupStorage'

const ready: CategoryList = {
  status: 'ready',
  categories: [
    { id: 'shapes', name: 'Фігури та кольори', photoCount: 12 },
    { id: 'digits', name: 'Цифри', photoCount: 10 },
    { id: 'arrows', name: 'Стрілки', photoCount: 8 },
  ],
}

function setup(overrides: Partial<Parameters<typeof SetupScreen>[0]> = {}) {
  const onStart = vi.fn<(s: GameSetup) => void>()
  const onRetryList = vi.fn()
  render(
    <SetupScreen
      initial={DEFAULT_SETUP}
      categories={ready}
      starting={false}
      startError={false}
      onRetryList={onRetryList}
      onStart={onStart}
      {...overrides}
    />,
  )
  return { onStart, onRetryList }
}

const startButton = () => screen.getByRole('button', { name: /Почати дуель/ })
const categories = () => within(screen.getByRole('group', { name: 'Категорії' }))
const settingsButton = () => screen.getByRole('button', { name: /^Налаштування гри/ })
const openSettings = () => fireEvent.click(settingsButton())
const closeSettings = () => fireEvent.click(screen.getByRole('button', { name: 'Готово' }))

describe('SetupScreen', () => {
  it('lists categories with photo counts', () => {
    setup()
    expect(categories().getByRole('radio', { name: /Цифри\s*10\s+фото/ })).toBeInTheDocument()
  })

  it('filters categories by search, case-insensitively', () => {
    setup()
    fireEvent.change(screen.getByLabelText('Пошук категорії'), { target: { value: 'ФІГУ' } })
    expect(categories().getAllByRole('radio')).toHaveLength(1)
    expect(categories().getByText('Фігури та кольори')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Пошук категорії'), { target: { value: 'xyz' } })
    expect(screen.getByText('Нічого не знайдено')).toBeInTheDocument()
  })

  it('groups each setting as native radios named by its legend', () => {
    setup()
    openSettings()
    const time = within(screen.getByRole('group', { name: 'Час на гравця' }))
    const radios = time.getAllByRole('radio')
    expect(radios).toHaveLength(3)
    // One shared name: the browser moves through and selects them with the arrow keys.
    expect(new Set(radios.map((r) => r.getAttribute('name'))).size).toBe(1)
    fireEvent.click(time.getByRole('radio', { name: '90\u00a0с' }))
    expect(time.getByRole('radio', { name: '90\u00a0с' })).toBeChecked()
    expect(time.getByRole('radio', { name: '60\u00a0с' })).not.toBeChecked()
    expect(screen.getByRole('textbox', { name: 'Гравець 1' })).toHaveAttribute(
      'spellcheck',
      'false',
    )
  })

  it('keeps start disabled until a category is picked', () => {
    const { onStart } = setup()
    expect(startButton()).toBeDisabled()
    fireEvent.click(categories().getByRole('radio', { name: /Стрілки/ }))
    expect(categories().getByRole('radio', { name: /Стрілки/ })).toBeChecked()
    expect(startButton()).toBeEnabled()
    fireEvent.click(startButton())
    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ categoryId: 'arrows' }))
  })

  it('submits the chosen names and settings; an empty name stays empty for the fallback', () => {
    const { onStart } = setup()
    openSettings()
    fireEvent.change(screen.getByRole('textbox', { name: 'Гравець 1' }), {
      target: { value: 'Назар' },
    })
    fireEvent.click(categories().getByRole('radio', { name: /Цифри/ }))
    fireEvent.click(screen.getByRole('radio', { name: '90\u00a0с' }))
    fireEvent.click(screen.getByRole('radio', { name: '5\u00a0с' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Випадково' }))
    closeSettings()
    fireEvent.click(startButton())
    expect(onStart).toHaveBeenCalledWith({
      names: ['Назар', ''],
      categoryId: 'digits',
      timePerPlayerMs: 90_000,
      penaltyMs: 5_000,
      firstPlayer: 'random',
    })
  })

  it('pre-fills names and settings from the remembered setup', () => {
    setup({
      initial: {
        names: ['Назар', 'Олена'],
        categoryId: 'digits',
        timePerPlayerMs: 90_000,
        penaltyMs: 5_000,
        firstPlayer: 'random',
      },
    })
    expect(settingsButton()).toHaveTextContent('Назар vs Олена · 90 с · штраф 5 с')
    expect(categories().getByRole('radio', { name: /Цифри/ })).toBeChecked()
    openSettings()
    expect(screen.getByRole('textbox', { name: 'Гравець 1' })).toHaveValue('Назар')
    expect(screen.getByRole('textbox', { name: 'Гравець 2' })).toHaveValue('Олена')
    expect(screen.getByRole('radio', { name: '90\u00a0с' })).toBeChecked()
    expect(screen.getByRole('radio', { name: '5\u00a0с' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Випадково' })).toBeChecked()
  })

  it('ignores a remembered category that is no longer listed', () => {
    setup({ initial: { ...DEFAULT_SETUP, categoryId: 'gone' } })
    expect(startButton()).toBeDisabled()
  })

  it('limits names to 20 characters', () => {
    setup()
    openSettings()
    expect(screen.getByRole('textbox', { name: 'Гравець 2' })).toHaveAttribute('maxLength', '20')
  })

  it('shows a list error with a retry', () => {
    const { onRetryList } = setup({ categories: { status: 'error' } })
    fireEvent.click(screen.getByRole('button', { name: 'Спробувати ще' }))
    expect(onRetryList).toHaveBeenCalled()
  })

  it('shows the loading state while the category loads', () => {
    setup({ initial: { ...DEFAULT_SETUP, categoryId: 'digits' }, starting: true })
    expect(screen.getByRole('button', { name: /Завантаження/ })).toBeDisabled()
  })

  it('summarises the settings in the header with fallback names', () => {
    setup()
    expect(settingsButton()).toHaveTextContent('Гравець 1 vs Гравець 2 · 60 с · штраф 3 с')
  })

  it('opens the settings panel over an inert form; Enter in a name or Esc closes it', () => {
    setup()
    settingsButton().focus()
    openSettings()
    const name = screen.getByRole('textbox', { name: 'Гравець 1' })
    expect(screen.getByRole('dialog', { name: 'Налаштування гри' })).toBeInTheDocument()
    expect(name).toHaveFocus()
    expect(startButton().closest('[inert]')).not.toBeNull()

    fireEvent.change(name, { target: { value: 'Назар' } })
    fireEvent.submit(name)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(startButton().closest('[inert]')).toBeNull()
    expect(settingsButton()).toHaveFocus()
    expect(settingsButton()).toHaveTextContent('Назар vs Гравець 2')

    openSettings()
    fireEvent.keyDown(window, { code: 'Escape', key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(settingsButton()).toHaveFocus()
  })
})
