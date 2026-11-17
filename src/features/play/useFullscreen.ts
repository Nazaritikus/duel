import { useCallback, useEffect, useState } from 'react'

export interface Fullscreen {
  supported: boolean
  active: boolean
  toggle: () => void
}

/** Browser fullscreen for the whole page; a refused request changes nothing. */
export function useFullscreen(doc: Document = document): Fullscreen {
  const supported = Boolean(doc.fullscreenEnabled)
  const [active, setActive] = useState(() => doc.fullscreenElement != null)

  useEffect(() => {
    const onChange = () => setActive(doc.fullscreenElement != null)
    doc.addEventListener('fullscreenchange', onChange)
    return () => doc.removeEventListener('fullscreenchange', onChange)
  }, [doc])

  const toggle = useCallback(() => {
    if (!doc.fullscreenEnabled) return
    const request = doc.fullscreenElement
      ? doc.exitFullscreen()
      : doc.documentElement.requestFullscreen()
    void Promise.resolve(request).catch(() => {})
  }, [doc])

  return { supported, active, toggle }
}
