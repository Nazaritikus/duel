import { useEffect, useRef } from 'react'
import { HotkeyList } from './HotkeyList'
import { useRestoreFocus } from './useRestoreFocus'
import { Kbd } from './Kbd'

/** «Як провести гру»: in-page panel with host steps and the cheat sheet; Esc closes it. */
export function HostHelp({ onClose }: { onClose: () => void }) {
  useRestoreFocus()
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
              Натисніть <Kbd>F</Kbd>, щоб розгорнути гру на весь екран.
            </li>
            <li>
              Оберіть категорію. Імена й час — у налаштуваннях (кнопка з шестернею вгорі). Потім
              «Почати дуель».
            </li>
            <li>
              Слухайте відповідь гравця й оцінюйте клавішами: <Kbd>→</Kbd> — правильно, <Kbd>X</Kbd>{' '}
              — помилка, <Kbd>P</Kbd> — пас.
            </li>
            <li>
              Не впевнені? <Kbd>Q</Kbd> зупиняє час і показує правильну відповідь усім — потім
              оцініть клавішею як завжди.
            </li>
            <li>
              <Kbd>Space</Kbd> ставить паузу (фото ховається), <Kbd>Esc</Kbd> — вихід у меню з
              підтвердженням.
            </li>
          </ol>
          <HotkeyList />
        </div>
      </div>
    </div>
  )
}
