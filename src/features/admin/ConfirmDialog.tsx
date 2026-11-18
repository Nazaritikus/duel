import { useEffect, useId, useLayoutEffect, useRef, type ReactNode } from 'react'

/**
 * Modal confirmation on the native `<dialog>` (the admin is not inside the scaled play stage).
 * Mounting opens it with focus on the cancel button; `Esc` cancels. On close, focus goes back
 * to the element that was focused before it opened, so render it next to a trigger that
 * stays mounted.
 */
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  cancelLabel = 'Скасувати',
  danger = false,
  onConfirm,
  onCancel,
}: {
  title: string
  children?: ReactNode
  confirmLabel: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const handlers = useRef({ onConfirm, onCancel })
  useLayoutEffect(() => {
    handlers.current = { onConfirm, onCancel }
  })

  useEffect(() => {
    const dialog = ref.current!
    const previous = document.activeElement
    const onClose = () => {
      // `close` is dispatched asynchronously: a stale one (e.g. from a StrictMode remount that
      // closed and reopened the dialog) must not settle the open dialog.
      if (dialog.open) return
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus()
      if (dialog.returnValue === 'confirm') handlers.current.onConfirm()
      else handlers.current.onCancel()
    }
    // `Esc`: close through the same path in every browser (and in tests).
    const onCancelEvent = (event: Event) => {
      event.preventDefault()
      dialog.close('cancel')
    }
    dialog.addEventListener('close', onClose)
    dialog.addEventListener('cancel', onCancelEvent)
    dialog.returnValue = ''
    if (!dialog.open) dialog.showModal()
    // React does not render `autofocus`, so showModal() would pick the first (destructive) button.
    cancelRef.current?.focus()
    return () => {
      dialog.removeEventListener('close', onClose)
      dialog.removeEventListener('cancel', onCancelEvent)
      if (dialog.open) dialog.close()
    }
  }, [])

  return (
    <dialog ref={ref} className="admin-dialog" aria-labelledby={titleId}>
      <h2 id={titleId} className="admin-dialog__title">
        {title}
      </h2>
      {children && <div className="admin-dialog__body">{children}</div>}
      <div className="admin-dialog__actions">
        <button
          type="button"
          className={danger ? 'admin-btn admin-btn--danger' : 'admin-btn admin-btn--primary'}
          onClick={() => ref.current?.close('confirm')}
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          ref={cancelRef}
          className="admin-btn"
          onClick={() => ref.current?.close('cancel')}
        >
          {cancelLabel}
        </button>
      </div>
    </dialog>
  )
}
