// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { routes } from './routes'

describe('routes', () => {
  it('renders the home page with a link to the demo game', () => {
    render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/'] })} />)
    expect(screen.getByRole('heading', { name: 'DUEL' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Демо-гра' })).toHaveAttribute('href', '/play')
  })

  it('renders the admin stub', () => {
    render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/admin/x'] })} />)
    expect(screen.getByRole('heading', { name: 'Адмінка — скоро' })).toBeInTheDocument()
  })
})
