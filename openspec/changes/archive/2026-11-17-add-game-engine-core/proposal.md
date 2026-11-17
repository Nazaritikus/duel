# Proposal

## Why

Every screen of Duel depends on the turn/clock logic, and it is the riskiest part to get wrong (tenths of a second decide a duel). Building it first as a pure, tested module lets later UI phases only render state and dispatch host actions.

## What Changes

- New framework-free game engine module in `src/game/`: state, actions and a reducer covering a single turn cycle.
- Chess-clock timing driven by timestamps passed in from the caller (no ticks counted, no drift when rendering is throttled).
- Host actions `correct`, `wrong`, `pass` with the timed feedback phases (2 s correct with both clocks stopped, 3 s wrong/pass penalty with the player's clock running).
- End of game when a player's time reaches 0, including mid-penalty.
- Host input received outside an active turn (during feedback or after the game finished) is ignored — this behavior was not specified yet.
- Vitest unit tests for every scenario implemented in this change.

**Game rules:** no existing rule changes. One rule is added to `specs/game-engine`: host input outside an active turn is ignored.

**Out of scope** (later phases): 3-2-1 countdown, pause/resume, photo shuffling and the "photos exhausted"/draw ending, statistics, time formatting, any UI, React hooks, Supabase. Until phase 2 the engine starts directly in the first turn and takes photos in the given order.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `game-engine`: adds a requirement that host input outside an active turn is ignored. The existing requirements "Chess-clock timers", "Correct answer", "Wrong answer or pass" and the time-out part of "End of game" are implemented by this change without changing their text.

## Impact

- New code: `src/game/` (types, reducer, tests). No changes to existing app code.
- No new dependencies (Vitest is already installed; tests run in the default Node environment).
- Phase 3 (`add-play-screen`) will consume this module through a rAF loop and host hotkeys.
