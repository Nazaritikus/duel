import type { ReactNode } from 'react'

/** A key label; never auto-translated (a translated "Space" or "Esc" would mislead the host). */
export function Kbd({ children }: { children: ReactNode }) {
  return <kbd translate="no">{children}</kbd>
}
