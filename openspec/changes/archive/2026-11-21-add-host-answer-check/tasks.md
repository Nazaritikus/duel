## 1. Engine

- [x] 1.1 Add `CheckingPhase` (`{ type: 'checking', player }`) to `ActivePhase` and a `check` action in `src/game/types.ts`; export them from `src/game/index.ts`
- [x] 1.2 Reducer: `check` from `turn` stops the clock and enters `checking`; it is ignored in every other phase, including a second press in `checking`
- [x] 1.3 Reducer: accept `correct`/`wrong`/`pass` from `checking`. `correct` enters `feedback_correct`; `wrong`/`pass` restart the same player's clock at `now` and enter `feedback_wrong`. Stats count as from `turn`
- [x] 1.4 Reducer: `resume` returns a paused `checking` unchanged, with no `endsAt` shift and the clock stopped
- [x] 1.5 Vitest (`reducer.test.ts`, `game.test.ts`): clocks frozen during a check; correct after a check; wrong after a check consumes the 3 s penalty (20.0 → 17.0); second check ignored; check ignored in countdown, feedback, paused and finished; pause/resume during a check; stats unchanged by the check itself

## 2. Hotkeys

- [x] 2.1 `useHostHotkeys.ts`: map `KeyQ` → `check` and dispatch it like the other game actions
- [x] 2.2 Tests: `KeyQ` with a Ukrainian layout (`key: 'й'`) dispatches `check`; ignored while typing in an input
- [x] 2.3 `HotkeyList.tsx`: add the row `Q` «Перевірити відповідь» (pause overlay and «Як провести гру»)

## 3. Game screen

- [x] 3.1 `panelView.ts`: `getOwner` includes `checking`; the owner gets `{ tone: 'checking', label: 'Перевірка' }`; tests in `panelView.test.ts`
- [x] 3.2 `PhotoFrame.tsx`: in `checking`, show the answer photo (if any) and the answer bar with the hint «→ правильно · X помилка»; neutral frame tone, no tint; CSS for the `checking` frame and panel tones (contrast ≥ 4.5:1, not opacity-only)
- [x] 3.3 Tests (`GameScreen.test.tsx` / `GameFlow.test.tsx`): `Q` shows the answer and «Перевірка», shows the answer photo when present, then `X` shows the penalty feedback; no sound on `check`
- [x] 3.4 Check the screen in the browser (local dev, mock catalog): turn → `Q` → `→`, and turn → `Q` → `Space` → `Space` → `X`

## 4. Docs and checks

- [x] 4.1 Update CLAUDE.md (hotkeys list) and the host help text if it names keys explicitly
- [x] 4.2 `npm run lint`, `npm run build`, `npm test`, `npx @fission-ai/openspec validate --all --strict`
