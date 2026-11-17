import { useEffect, useRef } from 'react'

interface ExitConfirmProps {
  onConfirm: () => void
  onCancel: () => void
}

/** In-stage confirmation; never a browser dialog (it would block the page and show on stream). */
export function ExitConfirm({ onConfirm, onCancel }: ExitConfirmProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)
  useEffect(() => confirmRef.current?.focus(), [])

  return (
    <div className="exit-confirm" role="alertdialog" aria-modal="true" aria-labelledby="exit-title">
      <div className="exit-confirm__box">
        <div className="exit-confirm__title" id="exit-title">
          Вийти в меню?
        </div>
        <div className="exit-confirm__hint">Поточна гра завершиться без результату</div>
        <div className="exit-confirm__actions">
          <button type="button" className="secondary-button" onClick={onCancel}>
            Продовжити гру <kbd>Esc</kbd>
          </button>
          <button type="button" className="danger-button" ref={confirmRef} onClick={onConfirm}>
            Вийти <kbd>Enter</kbd>
          </button>
        </div>
      </div>
    </div>
  )
}
