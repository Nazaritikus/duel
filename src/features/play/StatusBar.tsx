import type { GameState, PlayerIndex } from '../../game'
import { getPanelView } from './panelView'
import type { PlayerNames } from './types'

interface PlayerPanelProps {
  state: GameState
  player: PlayerIndex
  name: string
  now: number
}

export function PlayerPanel({ state, player, name, now }: PlayerPanelProps) {
  const view = getPanelView(state, player, now)
  const side = player === 0 ? 'left' : 'right'
  const identity = (
    <div className="panel__identity">
      <span className="panel__dot" aria-hidden="true" />
      <span className="panel__name">{name}</span>
      <span className="panel__tag">{view.label}</span>
    </div>
  )
  const time = <span className="panel__time">{view.time}</span>

  return (
    <section
      className={`panel panel--p${player + 1} panel--${side} panel--${view.tone}`}
      data-testid={`panel-${player + 1}`}
      data-tone={view.tone}
      aria-label={name}
    >
      <div className="panel__row">
        {player === 0 ? identity : time}
        {player === 0 ? time : identity}
      </div>
      <div className="panel__track">
        <div className="panel__bar" style={{ width: `${view.pct * 100}%` }} />
      </div>
    </section>
  )
}

export function StatusBar({
  state,
  names,
  now,
}: {
  state: GameState
  names: PlayerNames
  now: number
}) {
  return (
    <footer className="status-bar">
      <PlayerPanel state={state} player={0} name={names[0]} now={now} />
      <PlayerPanel state={state} player={1} name={names[1]} now={now} />
    </footer>
  )
}
