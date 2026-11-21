import { useCallback, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import type { PlayerIndex } from '../../game'
import { HostHelp } from './HostHelp'
import { displayNames, type GameSetup } from './setupStorage'
import { GearIcon, SetupSettings } from './SetupSettings'
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
        <fieldset className="category-grid" aria-label="Категорії">
          {shown.map((c) => (
            <label
              key={c.id}
              className={`category-card ${c.id === selectedId ? 'category-card--on' : ''}`}
            >
              <input
                type="radio"
                className="visually-hidden"
                name="category"
                value={c.id}
                checked={c.id === selectedId}
                onChange={() => onSelect(c.id)}
              />
              <span className="category-card__name">{c.name}</span>
              <span className="category-card__count">{`${c.photoCount}\u00a0фото`}</span>
            </label>
          ))}
        </fieldset>
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
  const [settingsOpen, setSettingsOpen] = useState(false)
  const closeSettings = useCallback(() => setSettingsOpen(false), [])
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

  const [p1, p2] = displayNames(setup)

  return (
    <>
      {/* While a panel is open the form behind it cannot take focus. */}
      <form className="setup" onSubmit={submit} inert={helpOpen || settingsOpen}>
        <header className="setup__header">
          <div className="setup__brand">
            <div className="setup__logo" translate="no">
              DUEL
            </div>
            <button
              type="button"
              className="settings-summary"
              onClick={() => setSettingsOpen(true)}
            >
              <GearIcon />
              <span className="visually-hidden">Налаштування гри: </span>
              <span className="settings-summary__names">
                <span className="settings-summary__p1">{p1}</span>
                <span className="settings-summary__vs"> vs </span>
                <span className="settings-summary__p2">{p2}</span>
              </span>
              <span className="settings-summary__options">
                {` · ${setup.timePerPlayerMs / 1000}\u00a0с · штраф ${setup.penaltyMs / 1000}\u00a0с`}
              </span>
            </button>
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
            <button type="submit" className="start-button" disabled={!canStart}>
              {starting ? 'Завантаження…' : 'Почати дуель'}
              <svg
                width="22"
                height="22"
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
        </header>

        <section className="setup__categories">
          <div className="setup__categories-head">
            <div className="setup-option__label">Категорія</div>
            {startError && (
              <div className="setup__error" role="alert">
                Не вдалося завантажити категорію
              </div>
            )}
            <label className="visually-hidden" htmlFor="category-search">
              Пошук категорії
            </label>
            <search>
              <input
                id="category-search"
                className="setup__search"
                type="search"
                placeholder="Пошук категорії"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </search>
          </div>
          <CategoryGrid
            list={categories}
            query={query}
            selectedId={selectedId}
            onSelect={(id) => update({ categoryId: id })}
            onRetry={onRetryList}
          />
        </section>
      </form>
      {settingsOpen && (
        <SetupSettings setup={setup} onName={setName} onChange={update} onClose={closeSettings} />
      )}
      {helpOpen && <HostHelp onClose={closeHelp} />}
    </>
  )
}
