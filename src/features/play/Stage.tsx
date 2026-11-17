import { useEffect, useState, type ReactNode } from 'react'
import { computeStageScale, STAGE_HEIGHT, STAGE_WIDTH } from './stageScale'

function useWindowScale(): number {
  const [scale, setScale] = useState(() => computeStageScale(window.innerWidth, window.innerHeight))
  useEffect(() => {
    const onResize = () => setScale(computeStageScale(window.innerWidth, window.innerHeight))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return scale
}

/** Fixed 1440×810 stage scaled to the window and letterboxed on the page background. */
export function Stage({ children }: { children: ReactNode }) {
  const scale = useWindowScale()
  return (
    <div className="stage-viewport">
      <div
        className="stage-frame"
        style={{ width: STAGE_WIDTH * scale, height: STAGE_HEIGHT * scale }}
      >
        <div
          className="stage"
          data-testid="stage"
          style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT, transform: `scale(${scale})` }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
