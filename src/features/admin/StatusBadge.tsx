import type { CategoryStatus } from './adminApi'

export function StatusBadge({ status }: { status: CategoryStatus }) {
  return status === 'published' ? (
    <span className="admin-badge admin-badge--published">Опубліковано</span>
  ) : (
    <span className="admin-badge admin-badge--draft">Чернетка</span>
  )
}
