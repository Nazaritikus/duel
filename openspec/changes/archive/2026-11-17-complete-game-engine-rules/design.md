# Design

## Context

The phase 1 engine (`src/game/`) is a pure reducer:
- every action carries `now`, and the reducer never reads a clock itself;
- the clock is "committed remaining time + running segment" (`clock.ts`);
- `resolveTime` applies time-driven transitions (time-out, feedback end) in chronological order before any action is handled;
- phases are a discriminated union, so this change adds variants without restructuring.

See proposal.md for scope. Requirements are in the `game-engine` and `game-ui` deltas of this change.

## Goals / Non-Goals

**Goals:**
- Keep the phase 1 invariants:
  - time is an input;
  - transitions are resolved at their exact timestamps, never at "when the tick arrived";
  - ignored actions return the same object (reference-equal).
- The engine is fully deterministic, given the seed.

**Non-Goals:**
- Choosing the seed or the settings. The caller does this (phase 4 setup screen: `Math.random()`/`Date.now()` seed).
- Hiding the photo during pause. That is UI; the engine only exposes the `paused` phase.

## Decisions

### 1. `createGame` takes an options object with a required seed
```ts
createGame({ photoIds, now, seed, settings?: Partial<Settings> }): GameState
```
`Settings` gains:
- `countdownMs` (3000);
- `firstPlayer: PlayerIndex | 'random'` (default `0`).

The seed is required so the call site always makes a conscious choice (a rematch passes a new seed). An empty `photoIds` throws: admin requires 60 photos to publish, so this is a programming error.
- *Alternative:* positional `(photoIds, now, settings, seed)`. Rejected: four positionals with an optional in the middle are easy to misuse.
- *Alternative:* shuffling outside the engine. Rejected: the spec makes the shuffle part of the game, and keeping it inside lets the seed also decide a random starting player.

### 2. Seeded PRNG + Fisher–Yates, in `shuffle.ts`
- `createRng(seed)` is mulberry32 (a 32-bit integer state, about 10 lines). It returns `() => number` in `[0, 1)`.
- `shuffle(items, rng)` is a Fisher–Yates shuffle that returns a new array.
- `createGame` draws from one rng in a fixed order: the shuffle first, then the random starter. The state stores the shuffled `photoIds`; the input array is not mutated.
- *Alternative:* `Math.random()`. Rejected: not reproducible, and it makes tests non-deterministic.

### 3. Countdown phase
```ts
{ type: 'countdown'; starter: PlayerIndex; endsAt: number }
```
- `createGame` starts in the countdown phase, with `clock.running = null`.
- `resolveTime` handles the countdown end like the feedback end: the starter's turn begins and their clock starts at `endsAt` (not `now`), so a late tick does not cost them time.
- The selector `getCountdownSeconds(state, now)` returns `ceil((endsAt - now) / 1000)`, which gives 3 → 2 → 1 for the UI.

### 4. Pause stores the interrupted phase and its remaining timer
```ts
{ type: 'paused'; resume: CountdownPhase | TurnPhase | FeedbackPhase; runningPlayer: PlayerIndex | null; pausedAt: number }
```
- **`pause(now)`:**
  1. call `resolveTime` first (a time-out that already happened wins);
  2. if the phase is `finished` or `paused`, return the state unchanged;
  3. otherwise remember `clock.running`, call `stopClock(clock, now)` (this commits the elapsed segment) and store the current phase in `resume`.
- **`resume(now)`:**
  1. shift `resume.endsAt` (if any) by `now - pausedAt`;
  2. restart `runningPlayer`'s clock at `now`.

  Shifting by the paused duration is the same as "continue with what was left", and it keeps a single representation for feedback and countdown.
- *Alternative:* a toggle action `togglePause`. Rejected: the UI maps `Space` to whichever action applies. Explicit actions make reducer tests read like the spec, and a duplicate key event cannot flip the state twice.
- *Alternative:* store only `pausedAt` and keep the clock "running". Rejected: `getRemainingMs` would keep decreasing during the pause.

### 5. Photos exhausted is resolved at the end of feedback
In `resolveTime`, when a feedback phase ends and `photoIndex + 1 >= photoIds.length`:
1. stop the clock at `endsAt`;
2. finish with `reason: 'photos_exhausted'`;
3. pick the winner by comparing `Math.floor(remaining / 100)`, where equal means `winner: null`.

The existing ordering rule still applies: a time-out at or before `endsAt` wins over the feedback end, so a time-out during the last penalty is a `timeout` loss.
- *Alternative:* finish the moment the last photo is judged. Rejected: the correct answer would not be shown and the penalty would be skipped, so a wrong answer on the last photo would be free.

### 6. Finished phase
```ts
{ type: 'finished'; winner: PlayerIndex | null; reason: 'timeout' | 'photos_exhausted'; at: number }
```
`winner: null` happens only with `photos_exhausted`. The UI maps the reasons to "Час суперника вичерпано", "Фото закінчились" and "Нічия".

### 7. Statistics live in state
`stats: readonly [PlayerStats, PlayerStats]` with `{ correct, wrong, pass }`. A count is incremented only when a host action is accepted (in a turn), so ignored presses never count. This is an immutable update: a new tuple and a new object for the affected player.

### 8. Time formatting is pure and lives in `src/game/format.ts`
- `formatTime(ms, { tenths })`:
  - `tenths: false` → `m:ss` from `Math.floor(ms / 1000)`;
  - `tenths: true` → `m:ss.t` from `Math.floor(ms / 100)`.
- `isLastSeconds(ms)` → `ms < 10_000`.

The UI decides `tenths = isActive && isLastSeconds(ms)`, because the spec shows tenths only for the active player. The game-ui spec owns the format; the helper sits next to the engine because it is framework-free and unit-tested like the rest.
- *Alternative:* ceil, which is chess-clock style. Rejected: with tenths it gives odd transitions (`0:10` → `0:10.0`), and the shown time would exceed the real remaining time.

### 9. File layout
- New files: `src/game/shuffle.ts` and `src/game/format.ts`, each with a `*.test.ts`.
- Extended: `types.ts`, `reducer.ts`, `clock.ts`.
- `index.ts` exports:
  - `createGame`, `gameReducer`, `getCurrentPhotoId`;
  - `getRemainingMs`, `getCountdownSeconds`, `otherPlayer`;
  - `formatTime`, `isLastSeconds`;
  - `DEFAULT_SETTINGS`;
  - the types.

## Risks / Trade-offs

- **[Existing 18 tests assume `createGame(photos, 0)` starts in a turn with photo `p0`]** → Add a test helper `startedGame()` that creates a game with `countdownMs: 0` (or ticks past the countdown) and reads photos from `state.photoIds`. The tests keep their meaning.
- **[Floating-point edge in tenths truncation, e.g. `12_300 / 100`]** → Times are integers or near-integers in ms. Tests cover the exact `12.3 s` vs `12.3 s` and `12.34` vs `12.39` cases.
- **[A random starter changes when the shuffle consumes a different number of draws, e.g. a different photo count]** → Acceptable. Reproducibility is promised per (photos, seed), not across categories.
- **[The `paused` phase hides the interrupted phase from the UI]** → The UI reads `phase.resume` when it needs the underlying state, for example to keep the frozen layout behind the pause overlay.
