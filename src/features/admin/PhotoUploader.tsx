import { useEffect, useLayoutEffect, useRef, useState, type DragEvent } from 'react'
import { useAdminApi, type AdminPhoto } from './adminApi'
import { ACCEPT_ATTRIBUTE, planUpload, type UploadError } from './upload/fileNames'
import { useImageCompressor } from './upload/compressorContext'
import { runQueue } from './upload/queue'

const CONCURRENCY = 3

interface Progress {
  total: number
  done: number
  running: boolean
}

const errorText = (e: unknown) => (e instanceof Error ? e.message : 'Невідома помилка')

/** Drop zone + file picker that plans, compresses and uploads a batch (design §1–§3). */
export function PhotoUploader({
  categoryId,
  photos,
  onUploaded,
  onRunningChange,
}: {
  categoryId: string
  photos: readonly AdminPhoto[]
  onUploaded: () => void
  /** The batch started or ended; the editor guards leaving the page while it runs. */
  onRunningChange?: (running: boolean) => void
}) {
  const api = useAdminApi()
  const compress = useImageCompressor()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [errors, setErrors] = useState<UploadError[]>([])

  async function upload(files: File[]) {
    if (!files.length || progress?.running) return
    const plan = planUpload(files, photos)
    const failed: UploadError[] = [...plan.errors]
    let position = photos.reduce((max, p) => Math.max(max, p.position), -1) + 1
    const byId = new Map(photos.map((p) => [p.id, p]))

    const tasks = plan.items.map((item) => {
      if (item.kind === 'new') {
        const at = position++
        return async () => {
          const image = await compress(item.file)
          const answerImage = item.answerFile ? await compress(item.answerFile) : null
          await api.addPhoto({ categoryId, position: at, answer: item.answer, image, answerImage })
        }
      }
      return async () => {
        const image = await compress(item.answerFile)
        await api.attachAnswerPhoto(byId.get(item.photoId)!, image)
      }
    })
    const names = plan.items.map((item) =>
      item.kind === 'new' ? item.file.name : item.answerFile.name,
    )

    setErrors(failed)
    setProgress({ total: tasks.length, done: 0, running: true })
    await runQueue(tasks, CONCURRENCY, (index, result) => {
      if (result.status === 'rejected') {
        failed.push({ fileName: names[index], reason: errorText(result.reason) })
        setErrors([...failed])
      }
      setProgress((p) => p && { ...p, done: p.done + 1 })
    })
    setProgress((p) => p && { ...p, running: false })
    if (tasks.length) onUploaded()
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    void upload(Array.from(event.dataTransfer.files))
  }

  const running = progress?.running ?? false
  const notifyRunning = useRef(onRunningChange)
  useLayoutEffect(() => {
    notifyRunning.current = onRunningChange
  })
  useEffect(() => {
    notifyRunning.current?.(running)
  }, [running])

  return (
    <div className="admin-upload">
      <div
        className={dragging ? 'admin-dropzone admin-dropzone--active' : 'admin-dropzone'}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        data-testid="dropzone"
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
        </svg>
        <div className="admin-dropzone__text">
          <span className="admin-dropzone__title">
            Перетягніть фото або{' '}
            <button
              type="button"
              className="admin-link-btn"
              disabled={running}
              onClick={() => inputRef.current?.click()}
            >
              оберіть файли
            </button>
          </span>
          <span>
            Назва файлу стає відповіддю: «fiat-500.jpg» → «Fiat 500». Фото відповіді:
            «fiat-500.answer.jpg»
          </span>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT_ATTRIBUTE}
          className="visually-hidden"
          aria-label="Обрати фото"
          tabIndex={-1}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            e.target.value = ''
            void upload(files)
          }}
        />
      </div>

      {progress && progress.total > 0 && (
        <div className="admin-progress">
          <label htmlFor={`upload-progress-${categoryId}`}>
            {running
              ? `Завантажено ${progress.done} з ${progress.total}`
              : `Готово: оброблено ${progress.done} з ${progress.total}`}
          </label>
          <progress
            id={`upload-progress-${categoryId}`}
            max={progress.total}
            value={progress.done}
          />
        </div>
      )}
      {/* Announced once, when the batch ends — not after every file. */}
      <p className="visually-hidden" role="status">
        {progress && !running && progress.total > 0
          ? `Готово: оброблено ${progress.done} з ${progress.total}`
          : ''}
      </p>
      {errors.length > 0 && (
        <div className="admin-problems" role="alert">
          <strong>Не завантажено ({errors.length}):</strong>
          <ul>
            {errors.map((e, i) => (
              <li key={`${e.fileName}-${i}`}>
                {e.fileName} — {e.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
