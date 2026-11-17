# Proposal

## Why

Phase 1 delivered one turn cycle. A real game still cannot run end to end: there is no countdown, no pause, no shuffle, and nothing happens when a category runs out of photos. The game screens in phases 3–4 need all of this, plus stats and formatted times, before they can be built on a complete engine.

## What Changes

- **Countdown:** a new game starts in a 3 s countdown with both clocks stopped. The starting player is player 1 or random, chosen in setup. When the countdown ends, the starting player's first turn begins.
- **Pause / resume** from countdown, turn and feedback. Both clocks stop and any countdown or feedback timer is suspended, then continues with its remaining time. Host judgements (`correct` / `wrong` / `pass`) are ignored while paused or during the countdown.
- **Seedable shuffle:** photos are shuffled once per game from a seed passed in by the caller. The same seed gives the same order, and photos never repeat.
- **Photos exhausted:** when the feedback for the last photo ends, the game finishes. The player with more remaining time wins; equal time to 0.1 s is a draw.
- **Statistics:** correct, wrong and pass counts per player.
- **Time formatting helper:** `m:ss`, `0:07.4` with tenths, truncated rather than rounded.
- **BREAKING (internal API only, no UI consumes it yet):**
  - `createGame` takes an options object with a required `seed`.
  - `Settings` gains `countdownMs` and `firstPlayer`.
  - `finished` phase now has `winner: PlayerIndex | null` (null = draw) and `reason: 'timeout' | 'photos_exhausted'`.
  - New actions `pause` / `resume`.

**Game rules.** These are the rule changes and clarifications in `specs/game-engine`:
- Countdown: its length is 3 s, and the random starting player is chosen at game creation.
- Pause: it is available during the countdown. It is a no-op before the game is active, after it has finished, and while already paused.
- Photo order: the shuffle is reproducible from a seed.
- End of game: "photos run out" is evaluated when the feedback for the last photo ends. A wrong answer or pass on the last photo therefore still costs its 3 s penalty, and a time-out during that penalty is still a loss. Equal time is compared after truncating both times to tenths.
- Host input: it is also ignored during the countdown and while paused.

Timer format in `specs/game-ui`: displayed time is truncated, never rounded up.

**Out of scope:**
- Any UI, React hooks or rAF loop (phase 3).
- The setup screen that chooses settings (phase 4).
- Sounds.
- Supabase.
- Undo of host decisions (explicitly not allowed by the spec).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `game-engine`: modifies "Countdown before the first turn", "Pause", "Photo order", "End of game" and "Host input outside an active turn" (clarifications and new scenarios listed above). "Statistics" is implemented without a text change.
- `game-ui`: "Timer format" states that displayed time is truncated, with boundary scenarios.

## Impact

- `src/game/`:
  - types, clock and reducer are extended;
  - new modules for shuffle and time formatting;
  - existing 18 tests are adapted to the new `createGame` signature and the countdown start.
- No new dependencies. The seeded PRNG is a few lines of our own code.
- Phases 3–4 consume the result: `createGame`, `gameReducer`, `getRemainingMs`, `getCurrentPhotoId`, `getCountdownSeconds`, `formatTime`.
