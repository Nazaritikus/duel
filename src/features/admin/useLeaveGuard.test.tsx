// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { createMemoryRouter, Link, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { useLeaveGuard } from './useLeaveGuard'

function Editor() {
  const [dirty, setDirty] = useState(false)
  const [uploading, setUploading] = useState(false)
  const { dialog } = useLeaveGuard(
    dirty || uploading,
    uploading ? 'Завантаження ще триває.' : 'Незбережені зміни буде втрачено.',
  )
  return (
    <>
      <button type="button" onClick={() => setDirty(true)}>
        Змінити
      </button>
      <button type="button" onClick={() => setUploading((u) => !u)}>
        Завантаження
      </button>
      <Link to="/list">← Категорії</Link>
      {dialog}
    </>
  )
}

function renderGuarded() {
  const router = createMemoryRouter(
    [
      { path: '/edit', element: <Editor /> },
      { path: '/list', element: <p>Список</p> },
    ],
    { initialEntries: ['/edit'] },
  )
  render(<RouterProvider router={router} />)
  return router
}

describe('useLeaveGuard', () => {
  it('lets navigation through when there is nothing to lose', () => {
    const router = renderGuarded()
    fireEvent.click(screen.getByRole('link', { name: '← Категорії' }))
    expect(router.state.location.pathname).toBe('/list')
  })

  it('blocks navigation with a dialog; «Залишитися» keeps the page', async () => {
    const router = renderGuarded()
    fireEvent.click(screen.getByRole('button', { name: 'Змінити' }))
    fireEvent.click(screen.getByRole('link', { name: '← Категорії' }))
    const dialog = await screen.findByRole('dialog', { name: 'Залишити сторінку?' })
    expect(dialog).toHaveTextContent('Незбережені зміни буде втрачено.')
    fireEvent.click(screen.getByRole('button', { name: 'Залишитися' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/edit')
  })

  it('«Залишити сторінку» proceeds', async () => {
    const router = renderGuarded()
    fireEvent.click(screen.getByRole('button', { name: 'Змінити' }))
    fireEvent.click(screen.getByRole('link', { name: '← Категорії' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Залишити сторінку' }))
    expect(await screen.findByText('Список')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/list')
  })

  it('keeps the reason it opened with while it is open', async () => {
    renderGuarded()
    fireEvent.click(screen.getByRole('button', { name: 'Змінити' }))
    fireEvent.click(screen.getByRole('button', { name: 'Завантаження' }))
    fireEvent.click(screen.getByRole('link', { name: '← Категорії' }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('Завантаження ще триває.')
    // The upload ends while the dialog is open: the text stays.
    fireEvent.click(screen.getByRole('button', { name: 'Завантаження', hidden: true }))
    expect(dialog).toHaveTextContent('Завантаження ще триває.')
  })

  it('asks the browser before unload only while active', () => {
    renderGuarded()
    const before = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(before)
    expect(before.defaultPrevented).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Змінити' }))
    const after = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(after)
    expect(after.defaultPrevented).toBe(true)
  })
})
