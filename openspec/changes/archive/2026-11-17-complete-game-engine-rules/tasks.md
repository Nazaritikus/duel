# Tasks

## 1. Seeded shuffle

- [x] 1.1 Add `src/game/shuffle.ts` with `createRng(seed)` (mulberry32) and `shuffle(items, rng)` (Fisher–Yates, non-mutating). Verify with `shuffle.test.ts`:
  - same seed gives the same order;
  - different seeds give different orders for 60 items;
  - the output is a permutation (no repeats, no losses);
  - the input is untouched.

## 2. New `createGame` API and countdown

- [x] 2.1 Extend `types.ts`:
  - `Settings.countdownMs` and `Settings.firstPlayer`;
  - `countdown` and `paused` phases;
  - `finished.winner: PlayerIndex | null` and `FinishReason = 'timeout' | 'photos_exhausted'`;
  - `PlayerStats` and `stats`;
  - `pause` / `resume` actions.

  Verify with `npm run build` (type-check). Some failures are expected only in the not-yet-migrated tests/reducer.
- [x] 2.2 Change `createGame({ photoIds, now, seed, settings? })`:
  - shuffle with the seed, then resolve a `'random'` starter;
  - start in `countdown` with no clock running;
  - throw on empty `photoIds`.

  Verify with tests: the start state, a seeded random starter that is reproducible, and the throw on empty.
- [x] 2.3 Resolve the countdown end in `resolveTime`: the starter's turn begins and their clock starts at `endsAt`. Add `getCountdownSeconds`. Verify with the spec scenarios "Countdown ends" and "Clocks stopped during countdown", a late-tick test, and 3 → 2 → 1 seconds.
- [x] 2.4 Migrate the existing reducer/game tests to the new API via a `startedGame()` helper. Verify that all 18 original tests pass with unchanged intent (`npm test`).

## 3. Pause / resume

- [x] 3.1 Implement `pause` / `resume` in the reducer:
  - `resolveTime` first;
  - commit and stop the clock, store the interrupted phase and the running player;
  - on resume, shift `endsAt` by the paused duration and restart the clock;
  - no-op in `finished` / repeated pause / resume when not paused.

  Verify with tests for every scenario of "Pause":
  - during the penalty;
  - clocks frozen;
  - during correct feedback;
  - during the countdown;
  - after finished.
- [x] 3.2 Ignore host judgements during the countdown and while paused. Verify with the tests "Press during countdown" and "Press while paused", which assert the same object is returned.

## 4. Photos exhausted, draw and statistics

- [x] 4.1 Finish with `photos_exhausted` when the last photo's feedback ends:
  - compare remaining time truncated to tenths;
  - `winner: null` on equal.

  Verify with tests:
  - "Photos run out" (14.2 vs 9.8);
  - "Draw" (12.3 vs 12.3);
  - "Draw within the same tenth" (12.34 vs 12.39);
  - "Wrong answer on the last photo";
  - a time-out during the last penalty is still `timeout`.
- [x] 4.2 Count `correct` / `wrong` / `pass` per player on accepted host actions only. Verify with the test "Stats on finish" and a test that ignored presses (during feedback, paused, finished) do not count.

## 5. Time formatting

- [x] 5.1 Add `src/game/format.ts` with `formatTime(ms, { tenths })` (truncating) and `isLastSeconds(ms)`. Verify with `format.test.ts`:
  - `60_000` → `1:00`;
  - `42_900` → `0:42`;
  - `7_460` with tenths → `0:07.4`;
  - `0` → `0:00` / `0:00.0`;
  - the `9_999` / `10_000` boundary for `isLastSeconds`.

## 6. Public API and spec coverage

- [x] 6.1 Update `src/game/index.ts` exports (`getCountdownSeconds`, `formatTime`, `isLastSeconds`, new types). Verify that `npm run build`, `npm run lint` and `npm test` all pass.
- [x] 6.2 Walk through every scenario in `openspec/specs/game-engine/spec.md` plus this change's deltas, and confirm each has a named test. Verify by listing the scenario → test mapping in the PR/commit description.

## Workflow follow-up

- Run `npx @fission-ai/openspec validate --all`, then `/openspec-archive-change`.
- Update `docs/roadmap.md`: phase 2 → `✔ <date>`, fill the "Result" column and add the phase summary.
