import { Kbd } from './Kbd'

const HOTKEYS: readonly [keys: string[], action: string][] = [
  [['→', 'Enter'], 'Правильна відповідь'],
  [['X'], 'Помилка'],
  [['P'], 'Пас'],
  [['Q'], 'Перевірити відповідь'],
  [['Space'], 'Пауза / продовжити'],
  [['Esc'], 'Вийти в меню'],
  [['F'], 'На весь екран'],
  [['M'], 'Звук увімк. / вимк.'],
]

/** The hotkeys cheat sheet (help panel and pause overlay). */
export function HotkeyList({ compact = false }: { compact?: boolean }) {
  return (
    <dl className={compact ? 'hotkeys hotkeys--compact' : 'hotkeys'} aria-label="Гарячі клавіші">
      {HOTKEYS.map(([keys, action]) => (
        <div key={action} className="hotkeys__row">
          <dt>
            {keys.map((k, i) => (
              <span key={k}>
                {i > 0 && ' / '}
                <Kbd>{k}</Kbd>
              </span>
            ))}
          </dt>
          <dd>{action}</dd>
        </div>
      ))}
    </dl>
  )
}
