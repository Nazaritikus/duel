import { useEffect, useId, useRef, type FormEvent } from 'react'
import type { PlayerIndex } from '../../game'
import {
  NAME_MAX_LENGTH,
  PENALTY_OPTIONS_MS,
  TIME_OPTIONS_MS,
  type GameSetup,
} from './setupStorage'
import { useRestoreFocus } from './useRestoreFocus'

export function GearIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
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
  const name = useId()
  return (
    <fieldset className="setup-option">
      <legend className="setup-option__label">{label}</legend>
      <div className="setup-option__pills">
        {options.map((o, i) => (
          <label
            key={String(o.value)}
            className={`pill ${o.className ?? ''} ${o.value === value ? 'pill--on' : ''}`}
          >
            <input
              type="radio"
              className="visually-hidden"
              name={name}
              value={i}
              checked={o.value === value}
              onChange={() => onChange(o.value)}
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/**
 * «Налаштування гри»: in-page panel with the player names and the session options. Changes
 * apply as they are made; «Готово», Enter in a name field or Esc closes it.
 */
export function SetupSettings({
  setup,
  onName,
  onChange,
  onClose,
}: {
  setup: GameSetup
  onName: (player: PlayerIndex, name: string) => void
  onChange: (patch: Partial<GameSetup>) => void
  onClose: () => void
}) {
  useRestoreFocus()
  const firstRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    firstRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Escape') return
      event.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onClose()
  }

  return (
    <div
      className="host-help"
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-settings-title"
    >
      <form className="host-help__panel setup-settings" onSubmit={submit}>
        <header className="host-help__header">
          <h2 id="setup-settings-title" className="host-help__title">
            Налаштування гри
          </h2>
          <button type="submit" className="primary-button">
            Готово
          </button>
        </header>

        <div className="setup__players">
          {([0, 1] as const).map((p) => (
            <div key={p} className={`setup-player setup-player--p${p + 1}`}>
              <label className="setup-player__label" htmlFor={`player-${p + 1}`}>
                Гравець {p + 1}
              </label>
              <input
                ref={p === 0 ? firstRef : undefined}
                id={`player-${p + 1}`}
                className="setup-player__input"
                value={setup.names[p]}
                maxLength={NAME_MAX_LENGTH}
                placeholder={p === 0 ? 'Ім’я першого гравця' : 'Ім’я другого гравця'}
                autoComplete="off"
                autoCapitalize="words"
                autoCorrect="off"
                spellCheck={false}
                onChange={(e) => onName(p, e.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="setup__options">
          <Segmented
            label="Час на гравця"
            value={setup.timePerPlayerMs}
            onChange={(v) => onChange({ timePerPlayerMs: v })}
            options={TIME_OPTIONS_MS.map((ms) => ({ value: ms, label: `${ms / 1000} с` }))}
          />
          <Segmented
            label="Штраф за помилку"
            value={setup.penaltyMs}
            onChange={(v) => onChange({ penaltyMs: v })}
            options={PENALTY_OPTIONS_MS.map((ms) => ({ value: ms, label: `${ms / 1000} с` }))}
          />
          <Segmented<PlayerIndex | 'random'>
            label="Хто починає"
            value={setup.firstPlayer}
            onChange={(v) => onChange({ firstPlayer: v })}
            options={[
              { value: 0, label: 'Гравець 1', className: 'pill--p1' },
              { value: 'random', label: 'Випадково' },
            ]}
          />
        </div>
      </form>
    </div>
  )
}
