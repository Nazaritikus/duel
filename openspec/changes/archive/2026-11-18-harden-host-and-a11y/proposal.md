# Proposal: harden-host-and-a11y

## Why

A code review and two UI audits (Vercel Web Interface Guidelines, Chrome modern-web-guidance) turned up one host-facing bug and several accessibility and screen-share gaps on the play side.

- **The bug:** the hotkey listener cancels Enter/Space even when a button has focus. Tabbing to «Продовжити гру» in the exit dialog and pressing Enter exits the game.
- **Modal panels:** they do not contain or restore focus.
- **Setup choices:** they are not real radio groups.
- **Native controls:** scrollbars and other native controls render light.
- **Name inputs:** spellcheck squiggles show on stream.

These are small fixes that matter before real games are played over a call.

## What Changes

- **Hotkeys:** `Enter` and `Space` on a focused button activate that button instead of firing `correct` / `togglePause`.
  - The exit dialog's default focus stays on «Вийти» and the result screen focuses «Реванш», so the keyboard-only host flow (`Esc` → `Enter`, `Enter` for a rematch) is unchanged.
- **Exit confirmation and «Як провести гру»:**
  - the content behind them is made `inert` while they are open, so Tab cannot leave the panel;
  - focus returns to where it was when they close.
- **Setup choices become native radio groups** (`fieldset` + `input type="radio"` styled as the existing pills and cards):
  - time, penalty and starter;
  - the category grid.

  This gives arrow-key navigation and correct grouping. The look is unchanged.
- **Dark native controls:** `color-scheme: dark` (CSS and `<meta>`) plus `<meta name="theme-color">`.
- **Text hygiene on stream:**
  - player-name inputs and the category search with `spellcheck`/`autocorrect` off;
  - `translate="no"` on the logo, player names and `<kbd>` keys;
  - non-breaking spaces in «45 с» / «12 фото»;
  - the typographic apostrophe in «Ім’я».
- **Long text:** category names in setup cards clamp to 2 lines and long answers in the answer bar clamp to 2 lines, so neither overflows its fixed box.
- **Performance (no visible change):**
  - the remaining-time bar animates with `transform: scaleX` instead of `width`;
  - the on-screen photo gets `fetchpriority="high"`;
  - look-ahead preloads during the game get `fetchPriority = 'low'`;
  - the category photo sort uses `toSorted`.

## Out of scope

- **Game rules:** no change. `specs/game-engine` is untouched.
- **Admin:** the admin UI, storage and scripts are covered by the separate change `polish-admin-and-storage`.
- **Not done:**
  - View transitions between screens.
  - `font-size-adjust`.
  - Hover states.
- **Kept as is:** «Почати дуель» stays disabled until a category is picked. The audit suggested otherwise, but the spec and design deliberately require a category.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `game-ui`:
  - "Host hotkeys" (focused buttons keep Enter/Space);
  - "Exit to menu" and "Host help" (focus contained and restored);
  - "Setup screen" (radio groups with arrow keys, long names clamped, no spellcheck on names);
  - "Result screen" (default focus on «Реванш»);
  - added "Screen-share text hygiene" (dark native controls, no translation or spellcheck artefacts, long answers clamped).

## Impact

- **Code in `src/features/play/`:**
  - `useHostHotkeys.ts`;
  - `ExitConfirm.tsx`, `HostHelp.tsx`, `GameFlow.tsx` (inert container and focus restore);
  - `SetupScreen.tsx`, `ResultScreen.tsx`;
  - `StatusBar.tsx`, `PhotoFrame.tsx`, `imagePreloader.ts`, `GameFlow.tsx` (preload priority);
  - `supabaseCategorySource.ts`.
- **CSS and HTML:** `index.html`, `src/index.css`, `flow.css`, `play.css`.
- **Tests:** tests that query category cards and pills by role `button` switch to `radio`, and new tests cover the focus and hotkey behaviour.
- **Dependencies:** none new.
