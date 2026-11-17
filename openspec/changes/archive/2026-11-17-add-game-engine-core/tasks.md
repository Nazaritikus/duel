# Tasks

## 1. Types and clock

- [x] 1.1 Create `src/game/types.ts` with `Settings` (time per player, correct feedback 2000 ms, penalty 3000 ms), `GameState`, phase union and `Action` union (`tick`, `correct`, `wrong`, `pass`, each with `now`), using string-literal unions only; verify `npx tsc -b` passes
- [x] 1.2 Implement `src/game/clock.ts`: `getRemainingMs(state, player, now)`, start/stop helpers that commit the elapsed segment, clamping of out-of-order `now`; verify `clock.test.ts` covers running vs frozen player, commit on stop and a backwards timestamp

## 2. Turn cycle

- [x] 2.1 Implement `createGame(photoIds, now, settings = DEFAULT_SETTINGS)` starting player 1's turn with the first photo and their clock running; verify a test asserts phase, photo index and that only player 1's time decreases
- [x] 2.2 Implement `correct`: commit the active clock, enter `feedback/correct` for 2 s, and on `tick` past `endsAt` start the other player's turn from `endsAt` with the next photo; verify tests for "Turn passes after a correct answer" and that a late tick does not cost the next player time
- [x] 2.3 Implement `wrong` and `pass`: enter `feedback/wrong|pass` for 3 s with the clock running, then the same player's turn with the next photo; verify tests for "Penalty consumes the player's time" (20.0 s → 17.0 s) and "Pass"
- [x] 2.4 Make host actions outside a `turn` phase return the same state object; verify tests for all three scenarios of "Host input outside an active turn"

## 3. End of game on time-out

- [x] 3.1 Resolve time-out in `tick` and before every host action: finish with `reason: 'timeout'`, the other player as winner, `at` = the exact moment the clock hit 0 and remaining time 0; verify tests for time-out during a turn and that an action after the time-out is ignored
- [x] 3.2 Cover time-out during a penalty; verify the "Time runs out during penalty" test (1.5 s left, wrong answer → finished at 0:00 after 1.5 s, player 2 wins, feedback not awaited)
- [x] 3.3 Prove timing does not drift; verify a test that plays the same sequence with ticks every 16 ms and with ticks every 5 s and gets identical remaining times

## 4. Integration

- [x] 4.1 Export the public API from `src/game/index.ts` and add a scripted full-game test (several correct/wrong/pass actions until a time-out); verify `npm test -- --run`, `npx tsc -b` and `npm run lint` all pass
