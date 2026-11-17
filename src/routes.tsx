import { createBrowserRouter } from 'react-router-dom'
import { GameFlow } from './features/play/GameFlow'
import { createCategorySource } from './features/play/categorySource'
import { LazyAdminApp } from './features/admin/LazyAdminApp'

const categorySource = createCategorySource()

export const routes = [
  { path: '/', element: <GameFlow source={categorySource} /> },
  {
    path: '/admin/*',
    element: <LazyAdminApp />,
  },
]

export function createAppRouter() {
  return createBrowserRouter(routes)
}
