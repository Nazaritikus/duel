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

describe('SetupScreen', () => {
  it('lists categories with photo counts', () => {
    setup()
    expect(categories().getByRole('button', { name: /Цифри\s*10 фото/ })).toBeInTheDocument()
  })

  it('filters categories by search, case-insensitively', () => {
    setup()
    fireEvent.change(screen.getByLabelText('Пошук категорії'), { target: { value: 'ФІГУ' } })
    expect(categories().getAllByRole('button')).toHaveLength(1)
    expect(categories().getByText('Фігури та кольори')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Пошук категорії'), { target: { value: 'xyz' } })
    expect(screen.getByText('Нічого не знайдено')).toBeInTheDocument()
  })

  it('keeps start disabled until a category is picked', () => {
    const { onStart } = setup()
    expect(startButton()).toBeDisabled()
    fireEvent.click(categories().getByRole('button', { name: /Стрілки/ }))
    expect(categories().getByRole('button', { name: /Стрілки/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(startButton()).toBeEnabled()
    fireEvent.click(startButton())
    expect(onStart).toHaveBeenCalledWith(expect.objectContaining({ categoryId: 'arrows' }))
  })

  it('submits the chosen names and settings; an empty name stays empty for the fallback', () => {
    const { onStart } = setup()
    fireEvent.change(screen.getByLabelText('Гравець 1'), { target: { value: 'Назар' } })
    fireEvent.click(categories().getByRole('button', { name: /Цифри/ }))
    fireEvent.click(screen.getByRole('radio', { name: '90 с' }))
    fireEvent.click(screen.getByRole('radio', { name: '5 с' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Випадково' }))
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
    expect(screen.getByLabelText('Гравець 1')).toHaveValue('Назар')
    expect(screen.getByLabelText('Гравець 2')).toHaveValue('Олена')
    expect(screen.getByRole('radio', { name: '90 с' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: '5 с' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Випадково' })).toHaveAttribute('aria-checked', 'true')
    expect(categories().getByRole('button', { name: /Цифри/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('ignores a remembered category that is no longer listed', () => {
    setup({ initial: { ...DEFAULT_SETUP, categoryId: 'gone' } })
    expect(startButton()).toBeDisabled()
  })

  it('limits names to 20 characters', () => {
    setup()
    expect(screen.getByLabelText('Гравець 2')).toHaveAttribute('maxLength', '20')
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
})
