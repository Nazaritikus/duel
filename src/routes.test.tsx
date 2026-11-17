// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { routes } from './routes'

describe('routes', () => {
  // routes.tsx picks the catalog at import time; the mock is used when Supabase env is absent.
  it('renders the setup screen on /', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('[]')),
    )
    render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/'] })} />)
    expect(screen.getByRole('button', { name: /Почати дуель/ })).toBeInTheDocument()
    expect(await screen.findByText('Нічого не знайдено')).toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('lazy-loads the admin, which explains missing Supabase config', async () => {
    render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: ['/admin/x'] })} />)
    expect(
      await screen.findByRole('heading', { name: 'Supabase не налаштовано' }, { timeout: 5000 }),
    ).toBeInTheDocument()
  })
})
