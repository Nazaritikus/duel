import { createBrowserRouter } from 'react-router-dom'
import { GameFlow } from './features/play/GameFlow'
import { createMockCategorySource } from './features/play/mockCategorySource'
import { AdminStub } from './pages'

const categorySource = createMockCategorySource()

export const routes = [
  { path: '/', element: <GameFlow source={categorySource} /> },
  { path: '/admin/*', element: <AdminStub /> },
]

export function createAppRouter() {
  return createBrowserRouter(routes)
}
