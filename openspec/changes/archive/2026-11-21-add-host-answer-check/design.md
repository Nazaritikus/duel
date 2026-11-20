# Design

## Context

The engine (`src/game/reducer.ts`) has phases `countdown → turn → feedback → …`, plus `paused` and `finished`. Host verdicts are accepted only in `turn`. Feedback is the only state that shows the answer. `PhotoFrame` switches to the answer photo and answer bar when `phase.type === 'feedback'`, and `panelView` derives each panel's tag and tone from the phase. The tab is shared on the call, so whatever the host sees, the players see.

## Goals / Non-Goals

**Goals:**
- One key (`Q`) that reveals the answer mid-turn without costing either player time.
- After the check, judging works exactly as today: same feedback, penalty, stats and sounds.

**Non-Goals:**
- A private view of the answer for the host only.
- Cancelling a check.
- Counting checks in the statistics.

## Decisions

1. **A dedicated phase `{ type: 'checking', player }`** rather than a flag on `turn`.
   - It is part of `ActivePhase`, so pause/resume and exit-to-menu work unchanged. `pause` stores it as `resume` with `runningPlayer: null`, because the clock is already stopped.
   - Alternative: a `revealed` boolean on `turn`. Rejected because every `phase.type === 'turn'` check (verdicts, clock, timeouts) would also have to read the flag.
2. **Both clocks stop on `check`.** The answer is visible to both players, so a running clock would let the answering player read it out. With the clocks stopped, `resolveTime` can neither time out nor end a phase during `checking`, because it has no `endsAt`.
3. **Verdicts from `checking`.**
   - `correct`: identical to `turn`. The clock is stopped already; enter `feedback_correct`.
   - `wrong`/`pass`: the clock is restarted for the same player at `now` before entering `feedback_wrong`, because the penalty must consume their time.
   - Stats are counted as today.
4. **Resume of `checking`.** `resume` currently shifts `endsAt` for every non-`turn` phase. `checking` has no `endsAt`, so it is resumed as-is, and the clock stays stopped because `runningPlayer` is `null`.
5. **`check` is ignored outside `turn`**, including a second press in `checking`. This follows the existing "ignored actions return the same state" pattern.
6. **UI.**
   - `PhotoFrame` treats `checking` like feedback for the photo source and the answer bar.
   - It uses a neutral frame tone (`checking`: text colour, not green or red) and no tint overlay.
   - The right side of the answer bar shows the host hint «→ правильно · X помилка» with `Kbd` keys.
   - `panelView` returns `{ tone: 'checking', label: 'Перевірка' }` for the owner, and `getOwner` includes `checking`.
   - No sound on `check`.
7. **Hotkey.** Add `KeyQ: 'check'` to the game key map, matched by physical key, so it also works on a Ukrainian layout. The cheat-sheet row is «Перевірити відповідь».

## Risks / Trade-offs

- [Host forgets to judge after checking] → The game waits with the clocks stopped, so no one loses time. The hint on screen tells the host what to press.
- [Players see the answer before the verdict] → Accepted: this is inherent to a shared tab, and the stopped clocks keep it fair.
