import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useBlocker } from 'react-router-dom'
import { ConfirmDialog } from './ConfirmDialog'

/**
 * Asks before leaving while `active`: in-app navigation shows a ConfirmDialog with `message`,
 * reload or tab close shows the browser's own prompt. Render the returned `dialog`.
 * Call `allowNextNavigation()` right before an intended navigation (e.g. after saving) that
 * must not be blocked even though the state has not re-rendered yet.
 */
export function useLeaveGuard(active: boolean, message: string) {
  const allowNext = useRef(false)
  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) => {
        if (allowNext.current) {
          allowNext.current = false
          return false
        }
        return (
          active &&
          (currentLocation.pathname !== nextLocation.pathname ||
            currentLocation.search !== nextLocation.search)
        )
      },
      [active],
    ),
  )

  useEffect(() => {
    if (!active) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = '' // older browsers need it to show the prompt
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [active])

  // Keep the reason the dialog opened with: e.g. an upload that finishes while the dialog is
  // open must not swap its text for another reason.
  const [shownMessage, setShownMessage] = useState(message)
  if (blocker.state !== 'blocked' && shownMessage !== message) setShownMessage(message)

  const dialog: ReactNode =
    blocker.state === 'blocked' ? (
      <ConfirmDialog
        title="Залишити сторінку?"
        confirmLabel="Залишити сторінку"
        cancelLabel="Залишитися"
        danger
        onConfirm={() => blocker.proceed()}
        onCancel={() => blocker.reset()}
      >
        <p>{shownMessage}</p>
      </ConfirmDialog>
    ) : null

  const allowNextNavigation = useCallback(() => {
    allowNext.current = true
  }, [])

  return { dialog, allowNextNavigation }
}
