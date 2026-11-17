import { useEffect, useRef } from 'react'
import { HotkeyList } from './HotkeyList'

/** «Як провести гру»: in-page panel with host steps and the cheat sheet; Esc closes it. */
export function HostHelp({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Escape') return
      event.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="host-help" role="dialog" aria-modal="true" aria-labelledby="host-help-title">
      <div className="host-help__panel">
        <header className="host-help__header">
          <h2 id="host-help-title" className="host-help__title">
            Як провести гру
          </h2>
          <button ref={closeRef} type="button" className="secondary-button" onClick={onClose}>
            Закрити
          </button>
        </header>
        <div className="host-help__body">
          <ol className="host-help__steps">
            <li>
              У Zoom, Meet чи Discord поділіться <strong>цією вкладкою</strong> й увімкніть
              «Поділитися звуком вкладки», щоб гравці чули сигнали.
            </li>
            <li>
              Натисніть <kbd>F</kbd>, щоб розгорнути гру на весь екран.
            </li>
            <li>Введіть імена, оберіть категорію й налаштування, натисніть «Почати дуель».</li>
            <li>
              Слухайте відповідь гравця й оцінюйте клавішами: <kbd>→</kbd> — правильно, <kbd>X</kbd>{' '}
              — помилка, <kbd>P</kbd> — пас.
            </li>
            <li>
              <kbd>Space</kbd> ставить паузу (фото ховається), <kbd>Esc</kbd> — вихід у меню з
              підтвердженням.
            </li>
          </ol>
          <HotkeyList />
        </div>
      </div>
    </div>
  )
}
