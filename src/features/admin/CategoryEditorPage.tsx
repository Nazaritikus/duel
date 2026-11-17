import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AdminApiError, useAdminApi, type AdminCategory, type AdminPhoto } from './adminApi'
import { PhotoCard } from './PhotoCard'
import { PhotoUploader } from './PhotoUploader'
import { formatStats, getPublishProblems, type CategoryStats } from './publishRules'
import { StatusBadge } from './StatusBadge'

const NAME_MAX = 60

function validateName(name: string): string | null {
  const length = name.trim().length
  if (length === 0) return 'Введіть назву категорії'
  if (length > NAME_MAX) return `Назва довша за ${NAME_MAX} символів`
  return null
}

const message = (e: unknown, fallback: string) =>
  e instanceof AdminApiError ? e.message : fallback

function statsOf(photos: readonly AdminPhoto[]): CategoryStats {
  return {
    photoCount: photos.length,
    missingAnswers: photos.filter((p) => p.answer.trim() === '').length,
    verticalCount: photos.filter((p) => p.isVertical).length,
  }
}

type LoadState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'error' }
  | { status: 'ready'; category: AdminCategory | null }

export function CategoryEditorPage() {
  const { id } = useParams()
  const isNew = id === undefined
  const api = useAdminApi()
  const navigate = useNavigate()

  const [load, setLoad] = useState<LoadState>(
    isNew ? { status: 'ready', category: null } : { status: 'loading' },
  )
  const [name, setName] = useState('')
  const [hint, setHint] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [photos, setPhotos] = useState<AdminPhoto[] | null>(null)
  const [photosError, setPhotosError] = useState(false)

  const apply = useCallback((category: AdminCategory | null) => {
    if (!category) {
      setLoad({ status: 'missing' })
      return
    }
    setLoad({ status: 'ready', category })
    setName(category.name)
    setHint(category.hint)
  }, [])

  const reload = useCallback(async () => {
    if (id) apply(await api.getCategory(id))
  }, [api, apply, id])

  const reloadPhotos = useCallback(async () => {
    if (!id) return
    try {
      setPhotos(await api.listPhotos(id))
      setPhotosError(false)
    } catch {
      setPhotosError(true)
    }
  }, [api, id])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    api.getCategory(id).then(
      (category) => !cancelled && apply(category),
      () => !cancelled && setLoad({ status: 'error' }),
    )
    api.listPhotos(id).then(
      (list) => !cancelled && setPhotos(list),
      () => !cancelled && setPhotosError(true),
    )
    return () => {
      cancelled = true
    }
  }, [api, apply, id])

  if (load.status === 'loading') return <p className="admin-muted">Завантаження…</p>
  if (load.status === 'missing' || load.status === 'error') {
    return (
      <div className="admin-page">
        <Link to="/admin" className="admin-back">
          ← Категорії
        </Link>
        <p className="admin-error" role="alert">
          {load.status === 'missing'
            ? 'Категорію не знайдено.'
            : 'Не вдалося завантажити категорію.'}
        </p>
      </div>
    )
  }

  const category = load.category
  // Photos loaded here are fresher than the category's stats (answers edited in place).
  const stats = category ? (photos ? statsOf(photos) : category.stats) : null
  const problems = stats ? getPublishProblems(stats) : []

  async function run(action: () => Promise<void>, fallback: string) {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      await action()
    } catch (e) {
      setError(message(e, fallback))
    } finally {
      setBusy(false)
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    const invalid = validateName(name)
    setNameError(invalid)
    if (invalid) return
    await run(async () => {
      if (!category) {
        const created = await api.createCategory({ name, hint })
        navigate(`/admin/categories/${created.id}`, { replace: true })
        return
      }
      await api.updateCategory(category.id, { name, hint })
      await reload()
      setNotice('Збережено')
    }, 'Не вдалося зберегти категорію.')
  }

  const setStatus = (status: 'draft' | 'published') =>
    run(async () => {
      await api.setStatus(category!.id, status)
      await reload()
      setNotice(status === 'published' ? 'Категорію опубліковано' : 'Категорію знято з публікації')
    }, 'Не вдалося змінити статус.')

  const remove = () =>
    run(async () => {
      await api.deleteCategory(category!.id)
      navigate('/admin', { replace: true })
    }, 'Не вдалося видалити категорію.')

  return (
    <div className="admin-page">
      <form className="admin-editor" onSubmit={save} noValidate>
        <header className="admin-header">
          <div className="admin-header__title">
            <Link to="/admin" className="admin-back">
              ← Категорії
            </Link>
            <h1 className="admin-title">{category ? category.name : 'Нова категорія'}</h1>
          </div>
          <div className="admin-header__actions">
            {category && (
              <>
                <StatusBadge status={category.status} />
                <span className="admin-muted admin-stats">{formatStats(stats!)}</span>
              </>
            )}
            <button type="submit" className="admin-btn" disabled={busy}>
              Зберегти
            </button>
            {category?.status === 'published' && (
              <button
                type="button"
                className="admin-btn"
                disabled={busy}
                onClick={() => void setStatus('draft')}
              >
                Зняти з публікації
              </button>
            )}
            {category?.status === 'draft' && (
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                disabled={busy || problems.length > 0}
                aria-describedby={problems.length > 0 ? 'publish-problems' : undefined}
                onClick={() => void setStatus('published')}
              >
                Опублікувати
              </button>
            )}
          </div>
        </header>

        {category && problems.length > 0 && (
          <div
            id="publish-problems"
            className={
              category.status === 'published'
                ? 'admin-problems admin-problems--warning'
                : 'admin-problems'
            }
          >
            <strong>
              {category.status === 'published'
                ? 'Опублікована категорія не відповідає правилам:'
                : 'Щоб опублікувати, виправте:'}
            </strong>
            <ul>
              {problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        )}
        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="admin-notice" role="status">
            {notice}
          </p>
        )}

        <div className="admin-fields">
          <div className="admin-field">
            <label className="admin-label" htmlFor="category-name">
              Назва категорії
            </label>
            <input
              id="category-name"
              className={nameError ? 'admin-input admin-input--invalid' : 'admin-input'}
              value={name}
              maxLength={NAME_MAX + 20}
              aria-invalid={nameError !== null}
              aria-describedby={nameError ? 'category-name-error' : undefined}
              onChange={(e) => setName(e.target.value)}
            />
            {nameError && (
              <span id="category-name-error" className="admin-field__error">
                {nameError}
              </span>
            )}
          </div>
          <div className="admin-field">
            <label className="admin-label" htmlFor="category-hint">
              Підказка для гравців
            </label>
            <input
              id="category-hint"
              className="admin-input"
              value={hint}
              placeholder="Наприклад: назвіть марку і модель"
              onChange={(e) => setHint(e.target.value)}
            />
          </div>
        </div>
      </form>

      {category ? (
        <section className="admin-photos" aria-label="Фото">
          <PhotoUploader
            categoryId={category.id}
            photos={photos ?? []}
            onUploaded={() => void reloadPhotos()}
          />
          {photosError && (
            <p className="admin-error" role="alert">
              Не вдалося завантажити фото.{' '}
              <button type="button" className="admin-link-btn" onClick={() => void reloadPhotos()}>
                Спробувати ще раз
              </button>
            </p>
          )}
          {photos === null && !photosError && <p className="admin-muted">Завантаження фото…</p>}
          {photos?.length === 0 && <p className="admin-empty">Ще немає жодного фото.</p>}
          {photos && photos.length > 0 && (
            <div className="admin-grid">
              {photos.map((p) => (
                <PhotoCard
                  key={p.id}
                  photo={p}
                  onAnswerSaved={(photoId, answer) =>
                    setPhotos((list) =>
                      list ? list.map((x) => (x.id === photoId ? { ...x, answer } : x)) : list,
                    )
                  }
                  onChanged={() => void reloadPhotos()}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <p className="admin-note">Збережіть категорію, щоб додати фото.</p>
      )}

      {category && (
        <section className="admin-danger">
          {confirmDelete ? (
            <div className="admin-confirm" role="alertdialog" aria-labelledby="delete-title">
              <p id="delete-title">
                Видалити категорію «{category.name}» і всі її фото ({stats!.photoCount})? Це не
                можна скасувати.
              </p>
              <div className="admin-confirm__actions">
                <button
                  type="button"
                  className="admin-btn admin-btn--danger"
                  disabled={busy}
                  onClick={() => void remove()}
                >
                  Так, видалити
                </button>
                <button type="button" className="admin-btn" onClick={() => setConfirmDelete(false)}>
                  Скасувати
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="admin-link-btn admin-link-btn--danger"
              onClick={() => setConfirmDelete(true)}
            >
              Видалити категорію
            </button>
          )}
        </section>
      )}
    </div>
  )
}
