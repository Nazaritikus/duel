import { useEffect, useState } from 'react'

/**
 * For in-stage overlays: remembers what had focus when the overlay mounted and puts focus
 * back there when it unmounts (if that element is still on the page). Native `<dialog>`
 * does this itself, but it renders in the top layer, outside the scaled 16:9 stage.
 */
export function useRestoreFocus() {
  // Captured during the first render, before the overlay moves focus inside itself.
  const [previous] = useState(() => document.activeElement)
  useEffect(
    () => () => {
      if (previous instanceof HTMLElement && previous.isConnected && previous !== document.body) {
        previous.focus()
      }
    },
    [previous],
  )
}
