import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdminApi, type AdminCategory } from './adminApi'
import { formatUpdated, MIN_PHOTOS } from './publishRules'
import { StatusBadge } from './StatusBadge'

type ListState =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; categories: AdminCategory[] }

export function CategoriesPage() {
  const api = useAdminApi()
  const [list, setList] = useState<ListState>({ status: 'loading' })
  const [query, setQuery] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    api.listCategories().then(
      (categories) => !cancelled && setList({ status: 'ready', categories }),
      () => !cancelled && setList({ status: 'error' }),
    )
    return () => {
      cancelled = true
    }
  }, [api, attempt])

  const needle = query.trim().toLocaleLowerCase('uk')
  const rows =
    list.status === 'ready'
      ? list.categories.filter((c) => c.name.toLocaleLowerCase('uk').includes(needle))
      : []

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1 className="admin-title">Категорії</h1>
        <div className="admin-header__actions">
          <label htmlFor="admin-search" className="visually-hidden">
            Пошук
          </label>
          <input
            id="admin-search"
            className="admin-input admin-search"
            placeholder="Пошук категорії"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Link to="/admin/categories/new" className="admin-btn admin-btn--primary">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Нова категорія
          </Link>
        </div>
      </header>

      {list.status === 'loading' && <p className="admin-muted">Завантаження…</p>}
      {list.status === 'error' && (
        <p className="admin-error" role="alert">
          Не вдалося завантажити категорії.{' '}
          <button type="button" className="admin-link-btn" onClick={() => setAttempt((n) => n + 1)}>
            Спробувати ще раз
          </button>
        </p>
      )}
      {list.status === 'ready' && (
        <div className="admin-table" role="table" aria-label="Категорії">
          <div className="admin-table__row admin-table__head" role="row">
            <span role="columnheader">Обкладинка</span>
            <span role="columnheader">Назва</span>
            <span role="columnheader">Фото</span>
            <span role="columnheader">Статус</span>
            <span role="columnheader">Оновлено</span>
            <span role="columnheader">
              <span className="visually-hidden">Дії</span>
            </span>
          </div>
          {rows.map((c) => (
            <div key={c.id} className="admin-table__row" role="row">
              <span role="cell">
                {c.coverUrl ? (
                  <img className="admin-cover" src={c.coverUrl} alt="" loading="lazy" />
                ) : (
                  <span className="admin-ph admin-cover" aria-hidden="true" />
                )}
              </span>
              <span role="cell">
                <Link to={`/admin/categories/${c.id}`} className="admin-table__name">
                  {c.name}
                </Link>
              </span>
              <span
                role="cell"
                className={
                  c.stats.photoCount < MIN_PHOTOS ? 'admin-count admin-count--low' : 'admin-count'
                }
              >
                {c.stats.photoCount} фото
              </span>
              <span role="cell">
                <StatusBadge status={c.status} />
              </span>
              <span role="cell" className="admin-muted admin-date">
                {formatUpdated(c.updatedAt)}
              </span>
              <span role="cell" className="admin-table__edit">
                <Link to={`/admin/categories/${c.id}`} aria-label={`Редагувати «${c.name}»`}>
                  Редагувати
                </Link>
              </span>
            </div>
          ))}
          {rows.length === 0 && (
            <p className="admin-table__empty admin-muted">
              {list.categories.length === 0 ? 'Ще немає жодної категорії.' : 'Нічого не знайдено'}
            </p>
          )}
        </div>
      )}
      <p className="admin-note">
        Категорія з’являється в грі, коли опублікована і має щонайменше {MIN_PHOTOS} фото.
      </p>
    </div>
  )
}
