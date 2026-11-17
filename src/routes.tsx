import { createBrowserRouter } from 'react-router-dom'
import { GameFlow } from './features/play/GameFlow'
import { createMockCategorySource } from './features/play/mockCategorySource'
import { LazyAdminApp } from './features/admin/LazyAdminApp'

const categorySource = createMockCategorySource()

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
