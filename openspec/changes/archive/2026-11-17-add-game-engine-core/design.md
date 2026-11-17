# Design

## Context

Greenfield: `src/game/` is empty, there is no test setup beyond Vitest in `package.json` (default Node environment is enough for pure logic). The TS config uses `erasableSyntaxOnly`, so no `enum`s — string-literal unions instead. See proposal.md for motivation and scope; requirements live in `openspec/specs/game-engine/spec.md` plus this change's delta.

## Goals / Non-Goals

**Goals:**
- A deterministic, framework-free reducer that later phases can extend (countdown, pause, shuffle, stats) without restructuring.
- Exact timing: the result must not depend on how often the UI ticks.

**Non-Goals:**
- Scheduling (`requestAnimationFrame`, timers) — the caller (phase 3) owns the loop and passes `now` in.
- Persisting or serialising game state.

## Decisions

### 1. Time is an input, never read inside the engine
Every action carries `now: number` (milliseconds, from `performance.now()` in the app, plain numbers in tests). The reducer never calls `performance.now()`/`Date.now()`.
- *Why:* tests are deterministic and can jump time arbitrarily (sparse ticks prove there is no drift).
- *Alternative:* engine reads the clock itself — rejected, needs fake timers in every test and couples logic to the environment.

### 2. Clock = committed remaining time + running segment
```
clock: { remainingMs: [number, number]; running: 0 | 1 | null; since: number | null }
```
Remaining time of the running player is `remainingMs[running] - (now - since)`, computed by a selector `getRemainingMs(state, player, now)`. When a clock stops, the elapsed segment is committed into `remainingMs`.
- *Why:* no accumulated rounding, no tick counting; the UI reads remaining time from any frame.
- *Alternative:* decrement on each tick — rejected, drifts when the tab is throttled (explicit spec scenario).

### 3. Phases as a discriminated union
```
phase:
  | { type: 'turn'; player: 0 | 1 }
  | { type: 'feedback'; kind: 'correct' | 'wrong' | 'pass'; player: 0 | 1; endsAt: number }
  | { type: 'finished'; winner: 0 | 1; reason: 'timeout'; at: number }
```
Phase 2 adds `countdown` and `paused` and new finish reasons without touching existing branches.

### 4. Transitions are resolved from timestamps, not from "when the tick arrived"
`tick(now)` resolves, in order:
1. **Time-out:** if the running player's remaining time ≤ 0, finish at `at = since + remainingMs[running]` (the exact moment the clock hit 0), remaining = 0. This also applies during a wrong/pass penalty because that clock keeps running.
2. **Feedback end:** if `now >= endsAt`, leave feedback. Correct → other player's turn with the next photo, their clock starts at `endsAt` (not `now`), so a late tick does not give away time. Wrong/pass → same player's turn with the next photo (their clock never stopped).

Host actions (`correct`, `wrong`, `pass`) first apply `tick(now)`, so an action that arrives after a time-out is ignored.

### 5. Feedback timings
- Correct: both clocks stop (active segment committed), `endsAt = now + settings.correctFeedbackMs` (default 2000).
- Wrong/pass: clock keeps running, `endsAt = now + settings.penaltyMs` (default 3000). Pass is the same transition with `kind: 'pass'` so the UI can label it.

### 6. Out-of-turn input is a no-op
Any host action while `phase.type !== 'turn'` returns the same state object (reference-equal), which also makes React re-render cheap. Implements the ADDED requirement in this change.

### 7. Photos in this phase
State holds `photoIds: string[]` and `photoIndex`; each new turn advances the index by one. Shuffling and the "photos exhausted" ending arrive in phase 2 (see Risks).

### 8. File layout
`src/game/types.ts`, `src/game/clock.ts` (selectors and commit helpers), `src/game/reducer.ts` (`createGame(photoIds, now, settings = DEFAULT_SETTINGS)`, `gameReducer(state, action)`), `src/game/index.ts` (public exports), tests next to sources as `*.test.ts`.

## Risks / Trade-offs

- [Running out of photos is undefined until phase 2] → `photoIndex` may point past the end; `getCurrentPhotoId` returns `undefined`. Phase 2 adds the ending; tests in this phase always provide enough photos.
- [Out-of-order timestamps from the caller] → actions with `now` earlier than the last seen time are clamped to the last seen time, so time never flows backwards.
- [`createGame` starts the first turn immediately] → phase 2 inserts the countdown phase before the first turn; callers already go through `createGame`, so the change stays internal.
