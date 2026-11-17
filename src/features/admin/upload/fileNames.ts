/** File-name rules for bulk upload (spec: admin / Bulk photo upload). */

export const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'avif'] as const
export const ACCEPT_ATTRIBUTE = 'image/jpeg,image/png,image/webp,image/avif'

export interface ParsedName {
  /** Name without extension and without the `.answer` suffix. */
  base: string
  isAnswer: boolean
  /** Lower-case extension without the dot ('' when none). */
  ext: string
}

export function parseFileName(name: string): ParsedName {
  const dot = name.lastIndexOf('.')
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
  let base = dot > 0 ? name.slice(0, dot) : name
  const isAnswer = /\.answer$/i.test(base)
  if (isAnswer) base = base.slice(0, -'.answer'.length)
  return { base, isAnswer, ext }
}

/** `fiat-500` → «Fiat 500», `iPhone-15` → «iPhone 15». */
export function answerFromName(base: string): string {
  return base
    .split(/[-_.\s]+/)
    .filter(Boolean)
    .map((word) =>
      word === word.toLocaleLowerCase('uk')
        ? word.charAt(0).toLocaleUpperCase('uk') + word.slice(1)
        : word,
    )
    .join(' ')
}

const normalise = (s: string) => s.trim().toLocaleLowerCase('uk')

export interface ExistingPhotoRef {
  id: string
  answer: string
}

export type UploadItem<F> =
  | { kind: 'new'; file: F; answerFile: F | null; answer: string }
  | { kind: 'attach'; answerFile: F; photoId: string; answer: string }

export interface UploadError {
  fileName: string
  reason: string
}

export interface UploadPlan<F> {
  items: UploadItem<F>[]
  errors: UploadError[]
}

/**
 * Turns dropped files into upload items: question files (paired with `<name>.answer.<ext>` from
 * the same batch), answer files for existing photos, and errors for everything else.
 */
export function planUpload<F extends { name: string }>(
  files: readonly F[],
  existing: readonly ExistingPhotoRef[],
): UploadPlan<F> {
  const errors: UploadError[] = []
  const questions: { file: F; key: string; answer: string }[] = []
  const answers = new Map<string, F>()

  for (const file of files) {
    const parsed = parseFileName(file.name)
    if (!(IMAGE_EXTENSIONS as readonly string[]).includes(parsed.ext)) {
      errors.push({
        fileName: file.name,
        reason: 'Непідтримуваний формат (потрібно JPG, PNG, WebP або AVIF)',
      })
      continue
    }
    const answer = answerFromName(parsed.base)
    if (!answer) {
      errors.push({ fileName: file.name, reason: 'З назви файлу не вийшло відповіді' })
      continue
    }
    const key = normalise(answer)
    if (parsed.isAnswer) {
      if (answers.has(key)) {
        errors.push({ fileName: file.name, reason: 'Друге фото відповіді з такою самою назвою' })
      } else {
        answers.set(key, file)
      }
    } else {
      questions.push({ file, key, answer })
    }
  }

  const items: UploadItem<F>[] = []
  for (const q of questions) {
    const answerFile = answers.get(q.key) ?? null
    if (answerFile) answers.delete(q.key)
    items.push({ kind: 'new', file: q.file, answerFile, answer: q.answer })
  }

  for (const [key, answerFile] of answers) {
    const match = existing.find((p) => normalise(p.answer) === key)
    if (match) {
      items.push({ kind: 'attach', answerFile, photoId: match.id, answer: match.answer })
    } else {
      errors.push({
        fileName: answerFile.name,
        reason: `Немає фото «${answerFromName(parseFileName(answerFile.name).base)}» для цього фото відповіді`,
      })
    }
  }

  return { items, errors }
}
