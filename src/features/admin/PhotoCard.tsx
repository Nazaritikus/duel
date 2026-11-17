import { useRef, useState, type KeyboardEvent } from 'react'
import { AdminApiError, useAdminApi, type AdminPhoto } from './adminApi'
import { ACCEPT_ATTRIBUTE } from './upload/fileNames'
import { useImageCompressor } from './upload/compressorContext'

const message = (e: unknown, fallback: string) =>
  e instanceof AdminApiError || e instanceof Error ? e.message : fallback

/** One photo per the AdminCategoryEdit artboard: images, badge, inline answer, actions. */
export function PhotoCard({
  photo,
  onAnswerSaved,
  onChanged,
}: {
  photo: AdminPhoto
  /** The answer was saved; the parent updates its copy (and the stats) without a refetch. */
  onAnswerSaved: (id: string, answer: string) => void
  /** Files or rows changed; the parent reloads the photos (new signed URLs). */
  onChanged: () => void
}) {
  const api = useAdminApi()
  const compress = useImageCompressor()
  const fileRef = useRef<HTMLInputElement>(null)
  const [answer, setAnswer] = useState(photo.answer)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  const missing = answer.trim() === ''
  const label = photo.answer.trim() || 'без відповіді'

  async function saveAnswer() {
    const trimmed = answer.trim()
    if (trimmed === photo.answer) return
    setSaving(true)
    setError(null)
    try {
      await api.updateAnswer(photo.id, trimmed)
      setAnswer(trimmed)
      onAnswerSaved(photo.id, trimmed)
    } catch (e) {
      setError(message(e, 'Не вдалося зберегти відповідь.'))
    } finally {
      setSaving(false)
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.currentTarget.blur()
    } else if (event.key === 'Escape') {
      setAnswer(photo.answer)
    }
  }

  async function act(action: () => Promise<void>, fallback: string) {
    setBusy(true)
    setError(null)
    try {
      await action()
      onChanged()
    } catch (e) {
      setError(message(e, fallback))
      setBusy(false)
    }
  }

  const pickAnswerPhoto = (file: File) =>
    act(async () => {
      const image = await compress(file)
      await api.attachAnswerPhoto(photo, image)
    }, 'Не вдалося завантажити фото відповіді.')

  const hint = missing
    ? 'Немає відповіді'
    : photo.answerStoragePath
      ? 'Окреме фото відповіді'
      : 'Відповідь на тому ж фото'

  return (
    <article
      className={missing ? 'admin-card admin-card--missing' : 'admin-card'}
      aria-label={`Фото: ${label}`}
    >
      <div className="admin-card__images">
        <div className="admin-card__question admin-ph">
          {photo.url && <img src={photo.url} alt="" loading="lazy" />}
          {photo.isVertical && <span className="admin-card__badge">вертикальне</span>}
          {!confirming && (
            <button
              type="button"
              className="admin-card__icon admin-card__delete"
              aria-label="Видалити фото"
              disabled={busy}
              onClick={() => setConfirming(true)}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
              </svg>
            </button>
          )}
        </div>
        {photo.answerStoragePath ? (
          <div className="admin-card__answer admin-ph">
            {photo.answerUrl && <img src={photo.answerUrl} alt="" loading="lazy" />}
            <span className="admin-card__answer-label">відповідь</span>
            <div className="admin-card__answer-actions">
              <button
                type="button"
                className="admin-card__icon"
                aria-label="Замінити фото відповіді"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M4 12a8 8 0 0 1 14-5l2 2M20 12a8 8 0 0 1-14 5l-2-2M20 4v5h-5M4 20v-5h5" />
                </svg>
              </button>
              <button
                type="button"
                className="admin-card__icon"
                aria-label="Прибрати фото відповіді"
                disabled={busy}
                onClick={() =>
                  void act(
                    () => api.removeAnswerPhoto(photo),
                    'Не вдалося прибрати фото відповіді.',
                  )
                }
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="admin-card__add"
            aria-label="Додати фото відповіді"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>фото відповіді</span>
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          className="visually-hidden"
          tabIndex={-1}
          aria-label="Файл фото відповіді"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void pickAnswerPhoto(file)
          }}
        />
      </div>

      {confirming ? (
        <div
          className="admin-card__confirm"
          role="alertdialog"
          aria-label="Підтвердження видалення"
        >
          <span>Видалити фото?</span>
          <div>
            <button
              type="button"
              className="admin-btn admin-btn--danger admin-btn--small"
              disabled={busy}
              onClick={() => void act(() => api.deletePhoto(photo), 'Не вдалося видалити фото.')}
            >
              Так
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--small"
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              Ні
            </button>
          </div>
        </div>
      ) : (
        <div className="admin-card__body">
          <input
            className="admin-card__input"
            aria-label="Правильна відповідь"
            placeholder="Правильна відповідь"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onBlur={() => void saveAnswer()}
            onKeyDown={onKeyDown}
          />
          <span
            className={missing ? 'admin-card__hint admin-card__hint--missing' : 'admin-card__hint'}
          >
            {saving ? 'Збереження…' : hint}
          </span>
        </div>
      )}
      {error && (
        <p className="admin-card__error" role="alert">
          {error}
        </p>
      )}
    </article>
  )
}
