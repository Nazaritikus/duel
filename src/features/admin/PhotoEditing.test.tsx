// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AdminRoutes } from './AdminApp'
import { category, createFakeAdminApi, fakeImage, photo } from './fakeAdminApi'
import { ImageCompressorContext } from './upload/compressorContext'
import type { ImageCompressor } from './upload/image'

const cars = category({ id: 'cars', name: 'Автомобілі' })

function renderEditor(
  fake = createFakeAdminApi({ categories: [cars], photos: [] }),
  compress: ImageCompressor = vi.fn(async (file: Blob) =>
    (file as File).name.includes('tall') ? fakeImage(900, 1600) : fakeImage(),
  ),
) {
  const router = createMemoryRouter(
    [
      {
        path: '/admin/*',
        element: (
          <ImageCompressorContext.Provider value={compress}>
            <AdminRoutes api={fake.api} />
          </ImageCompressorContext.Provider>
        ),
      },
    ],
    { initialEntries: ['/admin/categories/cars'] },
  )
  render(<RouterProvider router={router} />)
  return { ...fake, compress }
}

const file = (name: string) => new File(['x'], name, { type: 'image/jpeg' })

function drop(files: File[]) {
  fireEvent.drop(screen.getByTestId('dropzone'), { dataTransfer: { files } })
}

const card = (name: string) => screen.getByRole('article', { name: `Фото: ${name}` })

describe('bulk upload', () => {
  it('uploads a batch with answers from file names and pairs answer photos', async () => {
    const { api } = renderEditor()
    await screen.findByText('Ще немає жодного фото.')
    drop([file('fiat-500.jpg'), file('fiat-500.answer.jpg'), file('tall-tower.jpg')])

    expect(await screen.findByRole('article', { name: 'Фото: Fiat 500' })).toBeInTheDocument()
    expect(card('Tall Tower')).toHaveTextContent('вертикальне')
    expect(card('Fiat 500')).toHaveTextContent('Окреме фото відповіді')
    expect(api.addPhoto).toHaveBeenCalledTimes(2)
    expect(api.addPhoto.mock.calls.map(([p]) => p.position).sort()).toEqual([0, 1])
    expect(screen.getByText('Готово: оброблено 2 з 2')).toBeInTheDocument()
    expect(screen.getByText('2 фото · 0 без відповіді · 1 вертикальне')).toBeInTheDocument()
  })

  it('appends after the last position and lists failed files', async () => {
    const fake = createFakeAdminApi({
      categories: [cars],
      photos: [photo({ id: 'p1', categoryId: 'cars', answer: 'Bmw', position: 7 })],
    })
    const compress = vi.fn(async (f: Blob) => {
      if ((f as File).name === 'broken.jpg') throw new Error('Не вдалося прочитати зображення')
      return fakeImage()
    })
    const { api } = renderEditor(fake, compress)
    await screen.findByRole('article', { name: 'Фото: Bmw' })
    drop([file('audi.jpg'), file('broken.jpg'), file('ghost.answer.jpg'), file('notes.txt')])

    const alert = await screen.findByRole('alert')
    await waitFor(() => expect(alert).toHaveTextContent('Не завантажено (3)'))
    expect(alert).toHaveTextContent('broken.jpg — Не вдалося прочитати зображення')
    expect(alert).toHaveTextContent('ghost.answer.jpg')
    expect(alert).toHaveTextContent('notes.txt')
    expect(api.addPhoto.mock.calls.map(([p]) => [p.answer, p.position])).toEqual([['Audi', 8]])
    expect(await screen.findByRole('article', { name: 'Фото: Audi' })).toBeInTheDocument()
  })

  it('attaches a lone answer file to the existing photo', async () => {
    const fake = createFakeAdminApi({
      categories: [cars],
      photos: [photo({ id: 'p1', categoryId: 'cars', answer: 'Fiat 500' })],
    })
    const { api } = renderEditor(fake)
    await screen.findByRole('article', { name: 'Фото: Fiat 500' })
    drop([file('FIAT-500.answer.jpg')])
    await waitFor(() => expect(api.attachAnswerPhoto).toHaveBeenCalled())
    expect(api.addPhoto).not.toHaveBeenCalled()
    expect(await screen.findByText('Окреме фото відповіді')).toBeInTheDocument()
  })
})

describe('photo card', () => {
  const withPhotos = () =>
    createFakeAdminApi({
      categories: [cars],
      photos: [
        photo({ id: 'p1', categoryId: 'cars', answer: '', position: 0 }),
        photo({
          id: 'p2',
          categoryId: 'cars',
          answer: 'Audi',
          position: 1,
          isVertical: true,
          answerStoragePath: 'cars/p2.answer.webp',
          answerUrl: 'blob:p2.answer',
        }),
      ],
    })

  it('marks an empty answer and saves an edit on Enter', async () => {
    const { api } = renderEditor(withPhotos())
    const empty = await screen.findByRole('article', { name: 'Фото: без відповіді' })
    expect(empty).toHaveClass('admin-card--missing')
    expect(empty).toHaveTextContent('Немає відповіді')
    expect(screen.getByText('1 фото без відповіді')).toBeInTheDocument()

    const input = within(empty).getByLabelText('Правильна відповідь')
    fireEvent.change(input, { target: { value: '  Fiat 500 ' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.blur(input)
    await waitFor(() => expect(api.updateAnswer).toHaveBeenCalledWith('p1', 'Fiat 500'))
    expect(api.updateAnswer).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByText('1 фото без відповіді')).not.toBeInTheDocument())
  })

  it('does not save an unchanged answer', async () => {
    const { api } = renderEditor(withPhotos())
    fireEvent.blur(
      within(await screen.findByRole('article', { name: 'Фото: Audi' })).getByLabelText(
        'Правильна відповідь',
      ),
    )
    expect(api.updateAnswer).not.toHaveBeenCalled()
  })

  it('deletes only after confirmation', async () => {
    const { api } = renderEditor(withPhotos())
    const audi = await screen.findByRole('article', { name: 'Фото: Audi' })
    fireEvent.click(within(audi).getByRole('button', { name: 'Видалити фото' }))
    fireEvent.click(within(audi).getByRole('button', { name: 'Ні' }))
    expect(api.deletePhoto).not.toHaveBeenCalled()

    fireEvent.click(within(audi).getByRole('button', { name: 'Видалити фото' }))
    fireEvent.click(within(audi).getByRole('button', { name: 'Так' }))
    await waitFor(() =>
      expect(screen.queryByRole('article', { name: 'Фото: Audi' })).not.toBeInTheDocument(),
    )
    expect(api.deletePhoto).toHaveBeenCalledWith(expect.objectContaining({ id: 'p2' }))
  })

  it('removes and adds an answer photo', async () => {
    const { api } = renderEditor(withPhotos())
    const audi = await screen.findByRole('article', { name: 'Фото: Audi' })
    expect(audi).toHaveTextContent('вертикальне')
    fireEvent.click(within(audi).getByRole('button', { name: 'Прибрати фото відповіді' }))
    await waitFor(() =>
      expect(within(card('Audi')).getByText('Відповідь на тому ж фото')).toBeInTheDocument(),
    )
    expect(api.removeAnswerPhoto).toHaveBeenCalled()

    fireEvent.change(within(card('Audi')).getByLabelText('Файл фото відповіді'), {
      target: { files: [file('x.jpg')] },
    })
    await waitFor(() =>
      expect(within(card('Audi')).getByText('Окреме фото відповіді')).toBeInTheDocument(),
    )
    expect(api.attachAnswerPhoto).toHaveBeenCalled()
  })
})

describe('categories list cover', () => {
  it('shows the first photo as cover, or a placeholder', async () => {
    const fake = createFakeAdminApi({
      categories: [
        category({ id: 'a', name: 'З обкладинкою', coverUrl: 'https://x/cover.webp' }),
        category({ id: 'b', name: 'Без фото' }),
      ],
    })
    const router = createMemoryRouter(
      [{ path: '/admin/*', element: <AdminRoutes api={fake.api} /> }],
      {
        initialEntries: ['/admin'],
      },
    )
    const { container } = render(<RouterProvider router={router} />)
    await screen.findByRole('link', { name: 'З обкладинкою' })
    const imgs = container.querySelectorAll('img.admin-cover')
    expect(imgs).toHaveLength(1)
    expect(imgs[0]).toHaveAttribute('src', 'https://x/cover.webp')
    expect(container.querySelectorAll('span.admin-cover')).toHaveLength(1)
  })
})
