import { createBrowserRouter } from 'react-router-dom'
import { AdminStub, HomePage } from './pages'
import { PlayPage } from './features/play/PlayPage'

export const routes = [
  { path: '/', element: <HomePage /> },
  { path: '/play', element: <PlayPage /> },
  { path: '/admin/*', element: <AdminStub /> },
]

export function createAppRouter() {
  return createBrowserRouter(routes)
}
