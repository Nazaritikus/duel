import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAdminApi, type AdminCategory } from './adminApi'
import { formatUpdated, MIN_PHOTOS } from './publishRules'
import { StatusBadge } from './StatusBadge'

type ListState =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; categories: AdminCategory[] }

export function CategoriesPage() {
  const api = useAdminApi()
  const [list, setList] = useState<ListState>({ status: 'loading' })
  const [params, setParams] = useSearchParams()
  // The field owns its value (router navigations are async, so a value read back from the
  // address would drop fast keystrokes); the address mirrors it so a reload or Back restores
  // the search, and `replace` keeps typing out of the history.
  const [query, setQueryState] = useState(() => params.get('q') ?? '')
  const setQuery = (q: string) => {
    setQueryState(q)
    setParams(q ? { q } : {}, { replace: true })
  }
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
          <search>
            <label htmlFor="admin-search" className="visually-hidden">
              Пошук
            </label>
            <input
              id="admin-search"
              type="search"
              className="admin-input admin-search"
              placeholder="Пошук категорії"
              autoComplete="off"
              spellCheck={false}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </search>
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
      {list.status === 'ready' && rows.length > 0 && (
        <table className="admin-table">
          <caption className="visually-hidden">Категорії</caption>
          <thead>
            <tr>
              <th scope="col">Обкладинка</th>
              <th scope="col">Назва</th>
              <th scope="col">Фото</th>
              <th scope="col">Статус</th>
              <th scope="col">Оновлено</th>
              <th scope="col">
                <span className="visually-hidden">Дії</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c, index) => (
              <tr key={c.id}>
                <td>
                  {c.coverUrl ? (
                    <img
                      className="admin-cover"
                      src={c.coverUrl}
                      alt=""
                      loading={index < 8 ? 'eager' : 'lazy'}
                    />
                  ) : (
                    <span className="admin-ph admin-cover" aria-hidden="true" />
                  )}
                </td>
                <td>
                  <Link to={`/admin/categories/${c.id}`} className="admin-table__name">
                    {c.name}
                  </Link>
                </td>
                <td
                  className={
                    c.stats.photoCount < MIN_PHOTOS ? 'admin-count admin-count--low' : 'admin-count'
                  }
                >
                  {c.stats.photoCount} фото
                </td>
                <td>
                  <StatusBadge status={c.status} />
                </td>
                <td className="admin-muted admin-date">{formatUpdated(c.updatedAt)}</td>
                <td className="admin-table__edit">
                  <Link to={`/admin/categories/${c.id}`} aria-label={`Редагувати «${c.name}»`}>
                    Редагувати
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {list.status === 'ready' && rows.length === 0 && (
        <p className="admin-table__empty admin-muted">
          {list.categories.length === 0 ? 'Ще немає жодної категорії.' : 'Нічого не знайдено'}
        </p>
      )}
      <p className="admin-note">
        Категорія з’являється в грі, коли опублікована і має щонайменше {MIN_PHOTOS} фото.
      </p>
    </div>
  )
}
