# Proposal

## Why

The host often isn't sure whether a player's answer is right (an obscure painting, a gemstone, a city), and today the correct answer only appears after the host has already judged. The host needs a way to check the answer first and then decide.

## What Changes

- New host hotkey `Q` «Перевірити відповідь» during a player's turn: both clocks stop, and the correct answer (plus the answer photo, if any) is shown on the shared screen.
- **Game rule change:** a new engine phase `checking`. It is entered from a turn by the new `check` action. Both clocks are stopped while in it. It is left only by a host verdict:
  - `correct` → `feedback_correct`, as today;
  - `wrong` or `pass` → `feedback_wrong`, with the penalty and the player's clock running, as today.
- There is no way back to the turn from `checking`, because the players have already seen the answer. Pressing `Q` again does nothing.
- Pause and exit-to-menu work during `checking`. Resuming returns to `checking` with both clocks still stopped.
- `checking` has its own look: a neutral frame, the answer bar, the answering player's panel tagged «Перевірка», and a hint for the host: «→ правильно · X помилка».
- The hotkeys cheat sheet (pause overlay, «Як провести гру») lists `Q`.

Out of scope:
- Showing the answer only to the host (a second screen or presenter view). The tab is shared, so players see the answer too, which is why the clocks stop.
- Undoing a check, or time limits on how long the host may check.
- New statistics for checks.
- Admin or database changes.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `game-engine`: new `checking` phase and `check` action. Host verdicts are also accepted while checking, and pause covers checking too.
- `game-ui`: the `Q` hotkey, the checking-state screen and the cheat-sheet entry.

## Impact

- `src/game/types.ts`, `src/game/reducer.ts`: new `CheckingPhase` in `ActivePhase`, new `check` action, and verdicts allowed from `checking`.
- `src/features/play/useHostHotkeys.ts`: `KeyQ` → `check`, matched by physical key so it also works on a Ukrainian layout (й).
- `src/features/play/panelView.ts`, `GameScreen.tsx`, `PhotoFrame.tsx`: render the checking state, showing the answer photo the same way as feedback.
- `src/features/play/HotkeyList.tsx`: new row.
- Sound: none on `check`. The verdict sounds as today.
- Tests: reducer, hotkeys, game screen.
