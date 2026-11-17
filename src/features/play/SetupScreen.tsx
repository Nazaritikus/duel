import { useCallback, useId, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import type { PlayerIndex } from '../../game'
import { HostHelp } from './HostHelp'
import {
  NAME_MAX_LENGTH,
  PENALTY_OPTIONS_MS,
  TIME_OPTIONS_MS,
  type GameSetup,
} from './setupStorage'
import type { CategorySummary } from './types'
import type { Fullscreen } from './useFullscreen'

export type CategoryList =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; categories: CategorySummary[] }

interface SetupScreenProps {
  initial: GameSetup
  categories: CategoryList
  /** True while the chosen category is being loaded after "Почати дуель". */
  starting: boolean
  startError: boolean
  onRetryList: () => void
  onStart: (setup: GameSetup) => void
  muted?: boolean
  onToggleMute?: () => void
  fullscreen?: Fullscreen
}

interface Option<T> {
  value: T
  label: string
  className?: string
}

function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
}) {
  const labelId = useId()
  return (
    <div className="setup-option">
      <div className="setup-option__label" id={labelId}>
        {label}
      </div>
      <div className="setup-option__pills" role="radiogroup" aria-labelledby={labelId}>
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            className={`pill ${o.className ?? ''} ${o.value === value ? 'pill--on' : ''}`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function CategoryGrid({
  list,
  query,
  selectedId,
  onSelect,
  onRetry,
}: {
  list: CategoryList
  query: string
  selectedId: string | null
  onSelect: (id: string) => void
  onRetry: () => void
}) {
  let body: ReactNode
  if (list.status === 'loading') {
    body = <div className="category-grid__note">Завантаження категорій…</div>
  } else if (list.status === 'error') {
    body = (
      <div className="category-grid__note">
        Не вдалося завантажити категорії{' '}
        <button type="button" className="link-button" onClick={onRetry}>
          Спробувати ще
        </button>
      </div>
    )
  } else {
    const q = query.trim().toLocaleLowerCase('uk')
    const shown = list.categories.filter((c) => c.name.toLocaleLowerCase('uk').includes(q))
    body =
      shown.length === 0 ? (
        <div className="category-grid__note">Нічого не знайдено</div>
      ) : (
        <div className="category-grid" role="group" aria-label="Категорії">
          {shown.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={c.id === selectedId}
              className={`category-card ${c.id === selectedId ? 'category-card--on' : ''}`}
              onClick={() => onSelect(c.id)}
            >
              <span className="category-card__name">{c.name}</span>
              <span className="category-card__count">{c.photoCount} фото</span>
            </button>
          ))}
        </div>
      )
  }
  return <>{body}</>
}

export function SetupScreen({
  initial,
  categories,
  starting,
  startError,
  onRetryList,
  onStart,
  muted = false,
  onToggleMute,
  fullscreen,
}: SetupScreenProps) {
  const [helpOpen, setHelpOpen] = useState(false)
  const closeHelp = useCallback(() => setHelpOpen(false), [])
  const [setup, setSetup] = useState<GameSetup>(initial)
  const [query, setQuery] = useState('')
  const update = (patch: Partial<GameSetup>) => setSetup((s) => ({ ...s, ...patch }))
  const setName = (player: PlayerIndex, name: string) =>
    setSetup((s) => {
      const names: [string, string] = [...s.names]
      names[player] = name
      return { ...s, names }
    })

  // A remembered category that is no longer listed does not count as selected.
  const selectedId = useMemo(() => {
    if (categories.status !== 'ready') return null
    return categories.categories.some((c) => c.id === setup.categoryId) ? setup.categoryId : null
  }, [categories, setup.categoryId])

  const canStart = selectedId !== null && !starting

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (canStart) onStart({ ...setup, categoryId: selectedId })
  }

  return (
    <form className="setup" onSubmit={submit}>
      <header className="setup__header">
        <div className="setup__brand">
          <div className="setup__logo">DUEL</div>
          <div className="setup__subtitle">Нова гра</div>
        </div>
        <div className="setup__tools">
          {onToggleMute && (
            <button
              type="button"
              className="tool-button"
              aria-pressed={!muted}
              onClick={onToggleMute}
            >
              Звук: {muted ? 'вимк.' : 'увімк.'}
            </button>
          )}
          {fullscreen?.supported && (
            <button type="button" className="tool-button" onClick={fullscreen.toggle}>
              {fullscreen.active ? 'Вийти з повного екрана' : 'На весь екран'}
            </button>
          )}
          <button type="button" className="tool-button" onClick={() => setHelpOpen(true)}>
            Як провести гру
          </button>
        </div>
      </header>
      {helpOpen && <HostHelp onClose={closeHelp} />}

      <div className="setup__players">
        {([0, 1] as const).map((p) => (
          <div key={p} className={`setup-player setup-player--p${p + 1}`}>
            <label className="setup-player__label" htmlFor={`player-${p + 1}`}>
              Гравець {p + 1}
            </label>
            <input
              id={`player-${p + 1}`}
              className="setup-player__input"
              value={setup.names[p]}
              maxLength={NAME_MAX_LENGTH}
              placeholder={p === 0 ? "Ім'я першого гравця" : "Ім'я другого гравця"}
              autoComplete="off"
              onChange={(e) => setName(p, e.target.value)}
            />
          </div>
        ))}
      </div>

      <section className="setup__categories">
        <div className="setup__categories-head">
          <div className="setup-option__label">Категорія</div>
          <label className="visually-hidden" htmlFor="category-search">
            Пошук категорії
          </label>
          <input
            id="category-search"
            className="setup__search"
            type="search"
            placeholder="Пошук категорії"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <CategoryGrid
          list={categories}
          query={query}
          selectedId={selectedId}
          onSelect={(id) => update({ categoryId: id })}
          onRetry={onRetryList}
        />
      </section>

      <footer className="setup__footer">
        <div className="setup__options">
          <Segmented
            label="Час на гравця"
            value={setup.timePerPlayerMs}
            onChange={(v) => update({ timePerPlayerMs: v })}
            options={TIME_OPTIONS_MS.map((ms) => ({ value: ms, label: `${ms / 1000} с` }))}
          />
          <Segmented
            label="Штраф за помилку"
            value={setup.penaltyMs}
            onChange={(v) => update({ penaltyMs: v })}
            options={PENALTY_OPTIONS_MS.map((ms) => ({ value: ms, label: `${ms / 1000} с` }))}
          />
          <Segmented<PlayerIndex | 'random'>
            label="Хто починає"
            value={setup.firstPlayer}
            onChange={(v) => update({ firstPlayer: v })}
            options={[
              { value: 0, label: 'Гравець 1', className: 'pill--p1' },
              { value: 'random', label: 'Випадково' },
            ]}
          />
        </div>
        <div className="setup__start">
          {startError && (
            <div className="setup__error" role="alert">
              Не вдалося завантажити категорію
            </div>
          )}
          <button type="submit" className="start-button" disabled={!canStart}>
            {starting ? 'Завантаження…' : 'Почати дуель'}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </footer>
    </form>
  )
}
