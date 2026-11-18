// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AdminApiError } from './adminApi'
import { AdminRoutes } from './AdminApp'
import { category, createFakeAdminApi } from './fakeAdminApi'

function renderAdmin(path: string, fake = createFakeAdminApi()) {
  const router = createMemoryRouter(
    [
      { path: '/admin/*', element: <AdminRoutes api={fake.api} /> },
      { path: '/', element: <p>game</p> },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
  return { ...fake, router }
}

const draftCars = category({
  id: 'cars',
  name: 'Автомобілі',
  hint: 'Марка і модель',
  stats: { photoCount: 12, missingAnswers: 3, verticalCount: 1 },
})
const flags = category({
  id: 'flags',
  name: 'Прапори країн',
  status: 'published',
  stats: { photoCount: 60, missingAnswers: 0, verticalCount: 0 },
})
const ready = category({
  id: 'ready',
  name: 'Готова',
  stats: { photoCount: 61, missingAnswers: 0, verticalCount: 0 },
})

describe('admin guard', () => {
  it('sends a visitor without a session to login and requests no data', async () => {
    const { api, router } = renderAdmin('/admin', createFakeAdminApi({ user: null }))
    expect(await screen.findByRole('heading', { name: 'Вхід' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/admin/login')
    expect(api.listCategories).not.toHaveBeenCalled()
  })

  it('shows a no-access page with logout to a non-admin', async () => {
    const { api } = renderAdmin('/admin', createFakeAdminApi({ isAdmin: false }))
    expect(await screen.findByRole('heading', { name: 'Немає доступу' })).toBeInTheDocument()
    expect(api.listCategories).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Вийти' }))
    expect(await screen.findByRole('heading', { name: 'Вхід' })).toBeInTheDocument()
  })

  it('shows the admin shell to an admin, and logout returns to login', async () => {
    renderAdmin('/admin', createFakeAdminApi({ categories: [flags] }))
    expect(await screen.findByRole('heading', { name: 'Категорії' })).toBeInTheDocument()
    expect(screen.getByText('admin@duel.test')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Вийти' }))
    expect(await screen.findByRole('heading', { name: 'Вхід' })).toBeInTheDocument()
  })
})

describe('login page', () => {
  it('sends a link and shows a neutral confirmation', async () => {
    const { api } = renderAdmin('/admin/login', createFakeAdminApi({ user: null }))
    fireEvent.change(await screen.findByLabelText('Електронна пошта'), {
      target: { value: 'someone@duel.test' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Надіслати посилання' }))
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Якщо адреса someone@duel.test має доступ, на неї надіслано посилання',
    )
    expect(api.requestMagicLink).toHaveBeenCalledWith('someone@duel.test')
  })

  it('shows an API error', async () => {
    const fake = createFakeAdminApi({ user: null })
    fake.api.requestMagicLink.mockRejectedValueOnce(new AdminApiError('Забагато запитів.'))
    renderAdmin('/admin/login', fake)
    fireEvent.change(await screen.findByLabelText('Електронна пошта'), {
      target: { value: 'a@b.c' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Надіслати посилання' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Забагато запитів.')
  })

  it('explains an expired link', async () => {
    renderAdmin('/admin?error_description=expired', createFakeAdminApi({ user: null }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Посилання недійсне або застаріле')
  })

  it('sends a signed-in user to the categories', async () => {
    const { router } = renderAdmin('/admin/login')
    await screen.findByRole('heading', { name: 'Категорії' })
    expect(router.state.location.pathname).toBe('/admin')
  })
})

describe('categories list', () => {
  it('lists categories with count, status and a red count below 50', async () => {
    renderAdmin('/admin', createFakeAdminApi({ categories: [draftCars, flags] }))
    const carsRow = (await screen.findByRole('link', { name: 'Автомобілі' })).closest('tr')!
    expect(screen.getByRole('table', { name: 'Категорії' })).toBeInTheDocument()
    expect(within(carsRow as HTMLElement).getByText('12 фото')).toHaveClass('admin-count--low')
    expect(within(carsRow as HTMLElement).getByText('Чернетка')).toBeInTheDocument()
    expect(within(carsRow as HTMLElement).getByText('сьогодні')).toBeInTheDocument()
    const flagsRow = screen.getByRole('link', { name: 'Прапори країн' }).closest('tr')!
    expect(within(flagsRow as HTMLElement).getByText('60 фото')).not.toHaveClass('admin-count--low')
    expect(within(flagsRow as HTMLElement).getByText('Опубліковано')).toBeInTheDocument()
  })

  it('filters by name, case-insensitively', async () => {
    renderAdmin('/admin', createFakeAdminApi({ categories: [draftCars, flags] }))
    await screen.findByRole('link', { name: 'Автомобілі' })
    fireEvent.change(screen.getByLabelText('Пошук'), { target: { value: 'АВТО' } })
    expect(screen.getByRole('link', { name: 'Автомобілі' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Прапори країн' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Пошук'), { target: { value: 'xyz' } })
    expect(screen.getByText('Нічого не знайдено')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('keeps the search in the address', async () => {
    const { router } = renderAdmin(
      '/admin?q=%D0%B0%D0%B2%D1%82%D0%BE',
      createFakeAdminApi({ categories: [draftCars, flags] }),
    )
    expect(await screen.findByRole('link', { name: 'Автомобілі' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Пошук' })).toHaveValue('авто')
    expect(screen.queryByRole('link', { name: 'Прапори країн' })).not.toBeInTheDocument()

    const entries = router.state.historyAction
    fireEvent.change(screen.getByLabelText('Пошук'), { target: { value: 'прапор' } })
    expect(new URLSearchParams(router.state.location.search).get('q')).toBe('прапор')
    expect(router.state.historyAction).toBe('REPLACE')
    expect(entries).toBe('POP')
    expect(screen.getByRole('link', { name: 'Прапори країн' })).toBeInTheDocument()
  })

  it('keeps every keystroke when typing fast', async () => {
    renderAdmin('/admin', createFakeAdminApi({ categories: [draftCars, flags] }))
    const search = await screen.findByRole('searchbox', { name: 'Пошук' })
    for (const value of ['а', 'ав', 'авт']) fireEvent.change(search, { target: { value } })
    expect(search).toHaveValue('авт')
    expect(screen.queryByRole('link', { name: 'Прапори країн' })).not.toBeInTheDocument()
  })
})

describe('category editor', () => {
  it('refuses a blank name', async () => {
    const { api } = renderAdmin('/admin/categories/new')
    fireEvent.change(await screen.findByLabelText('Назва категорії'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Зберегти' }))
    expect(await screen.findByText('Введіть назву категорії')).toBeInTheDocument()
    expect(api.createCategory).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Назва категорії')).toHaveFocus()
    expect(screen.getByLabelText('Назва категорії')).toHaveAttribute('aria-invalid', 'true')
  })

  it('asks before leaving with an unsaved hint; «Залишитися» keeps the edit', async () => {
    const { router } = renderAdmin(
      '/admin/categories/cars',
      createFakeAdminApi({ categories: [draftCars] }),
    )
    fireEvent.change(await screen.findByLabelText('Підказка для гравців'), {
      target: { value: 'Нова підказка' },
    })
    fireEvent.click(screen.getByRole('link', { name: '← Категорії' }))
    const dialog = await screen.findByRole('dialog', { name: 'Залишити сторінку?' })
    expect(dialog).toHaveTextContent('Незбережені зміни буде втрачено.')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Залишитися' }))
    expect(router.state.location.pathname).toBe('/admin/categories/cars')
    expect(screen.getByLabelText('Підказка для гравців')).toHaveValue('Нова підказка')

    fireEvent.click(screen.getByRole('link', { name: '← Категорії' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Залишити сторінку' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin'))
  })

  it('leaves without asking after the edits are saved', async () => {
    const { router } = renderAdmin(
      '/admin/categories/cars',
      createFakeAdminApi({ categories: [draftCars] }),
    )
    fireEvent.change(await screen.findByLabelText('Підказка для гравців'), {
      target: { value: 'Нова підказка' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Зберегти' }))
    expect(await screen.findByText('Збережено')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: '← Категорії' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('creates a draft and opens it', async () => {
    const { api, router } = renderAdmin('/admin/categories/new')
    fireEvent.change(await screen.findByLabelText('Назва категорії'), {
      target: { value: ' Тварини ' },
    })
    fireEvent.change(screen.getByLabelText('Підказка для гравців'), {
      target: { value: 'Назвіть тварину' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Зберегти' }))
    expect(await screen.findByRole('heading', { name: 'Тварини' })).toBeInTheDocument()
    expect(api.createCategory).toHaveBeenCalledWith({ name: ' Тварини ', hint: 'Назвіть тварину' })
    expect(router.state.location.pathname).toBe('/admin/categories/new-1')
    expect(screen.getByText('Чернетка')).toBeInTheDocument()
  })

  it('lists every publish problem and disables publishing', async () => {
    renderAdmin('/admin/categories/cars', createFakeAdminApi({ categories: [draftCars] }))
    expect(await screen.findByText('12 фото · 3 без відповіді · 1 вертикальне')).toBeInTheDocument()
    expect(screen.getByText('Потрібно щонайменше 50 фото, зараз 12')).toBeInTheDocument()
    expect(screen.getByText('3 фото без відповіді')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Опублікувати' })).toBeDisabled()
  })

  it('publishes a valid draft and unpublishes it again', async () => {
    const { api } = renderAdmin(
      '/admin/categories/ready',
      createFakeAdminApi({ categories: [ready] }),
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Опублікувати' }))
    expect(await screen.findByText('Категорію опубліковано')).toBeInTheDocument()
    expect(api.setStatus).toHaveBeenCalledWith('ready', 'published')
    fireEvent.click(screen.getByRole('button', { name: 'Зняти з публікації' }))
    expect(await screen.findByText('Категорію знято з публікації')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Опублікувати' })).toBeEnabled()
  })

  it('shows a DB publish refusal', async () => {
    const fake = createFakeAdminApi({ categories: [ready] })
    fake.api.setStatus.mockRejectedValueOnce(
      new AdminApiError('Категорія не відповідає правилам публікації.'),
    )
    renderAdmin('/admin/categories/ready', fake)
    fireEvent.click(await screen.findByRole('button', { name: 'Опублікувати' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('не відповідає правилам публікації')
  })

  it('saves name and hint', async () => {
    const { api } = renderAdmin(
      '/admin/categories/cars',
      createFakeAdminApi({ categories: [draftCars] }),
    )
    fireEvent.change(await screen.findByLabelText('Назва категорії'), { target: { value: 'Авто' } })
    fireEvent.click(screen.getByRole('button', { name: 'Зберегти' }))
    expect(await screen.findByText('Збережено')).toBeInTheDocument()
    expect(api.updateCategory).toHaveBeenCalledWith('cars', {
      name: 'Авто',
      hint: 'Марка і модель',
    })
  })

  it('deletes only after confirmation', async () => {
    const { api, router } = renderAdmin(
      '/admin/categories/cars',
      createFakeAdminApi({ categories: [draftCars] }),
    )
    const trigger = await screen.findByRole('button', { name: 'Видалити категорію' })
    fireEvent.click(trigger)
    expect(screen.getByRole('button', { name: 'Скасувати' })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Скасувати' }))
    expect(api.deleteCategory).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'Видалити категорію «Автомобілі»?' })
    expect(dialog).toHaveTextContent('Усі її фото (12) і файли буде видалено назавжди.')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Видалити' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin'))
    expect(api.deleteCategory).toHaveBeenCalledWith('cars')
    expect(await screen.findByText('Ще немає жодної категорії.')).toBeInTheDocument()
  })

  it('returns focus to «Видалити категорію» when the dialog is cancelled with Esc', async () => {
    renderAdmin('/admin/categories/cars', createFakeAdminApi({ categories: [draftCars] }))
    const trigger = await screen.findByRole('button', { name: 'Видалити категорію' })
    trigger.focus()
    fireEvent.click(trigger)
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('reports a missing category', async () => {
    renderAdmin('/admin/categories/nope')
    expect(await screen.findByRole('alert')).toHaveTextContent('Категорію не знайдено.')
  })
})
