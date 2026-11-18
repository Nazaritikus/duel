## 1. Hotkeys yield to focused controls

- [x] 1.1 In `useHostHotkeys.ts`, narrow `isEditable` to text entry only: radio, checkbox, button and similar input types no longer count as editable. Return `null` from `hotkeyFor` / `appHotkeyFor` for Enter, NumpadEnter or Space when the target is a button, an `a[href]`, a radio or a checkbox.
- [x] 1.2 Unit tests for `hotkeyFor` / `appHotkeyFor`:
  - Enter on a button → `null`;
  - Space on a radio → `null`;
  - `X` on a button → `wrong`;
  - `F` on a radio → `fullscreen`;
  - typing in a text input is still ignored.
- [x] 1.3 `ResultScreen` focuses «Реванш» on mount. Add flow tests:
  - result screen + Enter → rematch;
  - exit dialog, Tab to «Продовжити гру» + Enter → dialog closes and the game continues;
  - `Esc` → `Enter` still exits.

## 2. Overlay focus containment

- [x] 2.1 Add `useRestoreFocus()`. It records `document.activeElement` on mount and refocuses it on unmount if the element is still connected. Add a unit test.
- [x] 2.2 `ActiveGame`:
  - wrap the header, photo and status bar in a container with `inert` while the exit confirmation is open;
  - render `ExitConfirm` as a sibling;
  - use `useRestoreFocus` in `ExitConfirm`.
- [x] 2.3 `SetupScreen`:
  - wrap the form in a container with `inert` while «Як провести гру» is open;
  - render `HostHelp` as a sibling;
  - focus returns to «Як провести гру» on close.
- [x] 2.4 Tests:
  - background controls are inside an `[inert]` container while each overlay is open;
  - focus is back on «Як провести гру» after «Закрити» and after `Esc`.

## 3. Native radio groups on the setup screen

- [x] 3.1 Rebuild `Segmented` (time, penalty, who starts) as a `fieldset` + `legend` of `<label class="pill">` elements, each wrapping a visually hidden `input type="radio"`. Move the selected look to `.pill:has(:checked)` and the focus ring to `.pill:has(:focus-visible)` in `flow.css`. The look stays unchanged.
- [x] 3.2 Rebuild the category grid as a `fieldset` with a hidden legend «Категорія»: one `<label class="category-card">` per category, each wrapping a hidden radio named `category`. Keep the selected and focus styles identical.
- [x] 3.3 Update the existing tests (`SetupScreen`, `GameFlow`, `HostTools`, and any that click category cards or pills by role `button`) to use role `radio`. Add a test: an arrow key on a focused option selects the next one (native behaviour, checked through `fireEvent.click` / `change`; the real keyboard check is task 6.2).

## 4. Screen-share hygiene

- [x] 4.1 Add `<meta name="color-scheme" content="dark">` and `<meta name="theme-color" content="#0B0D12">` to `index.html`, and `:root { color-scheme: dark; }` to `src/index.css`.
- [x] 4.2 Player-name inputs: `spellCheck={false}`, `autoCorrect="off"`, `autoCapitalize="words"`. Category search: `type="search"`, `spellCheck={false}`, `autoCorrect="off"`, wrapped in `<search>`.
- [x] 4.3 Add a `Kbd` component with `translate="no"` and use it in `HotkeyList`, `HostHelp`, `ExitConfirm` and the other screens. Add `translate="no"` to the logo and to player names in `StatusBar`, `CountdownScreen` and `ResultScreen`.
- [x] 4.4 Typography:
  - a non-breaking space between number and unit («45 с», «N фото», the penalty pill);
  - «Ім’я» with U+2019.

  Update any test that matches these strings.
- [x] 4.5 Clamp the category-card name to 2 lines with an ellipsis, change the card to `min-height: 96px` and add `overflow-wrap: anywhere`. Clamp the answer bar to 2 lines.

## 5. Rendering and loading performance

- [x] 5.1 `.panel__bar`:
  - full width;
  - the width comes from `transform: scaleX(pct)` set in `StatusBar`;
  - `transform-origin: left` on the left panel and `right` on the right panel;
  - drop the flex-end trick.

  Update any `StatusBar` test that reads `style.width`.
- [x] 5.2 `PhotoFrame` `<img>`: `fetchPriority="high"`.
- [x] 5.3 `createImagePreloader().preload(src, { priority })` sets `image.fetchPriority` before `src`. During the game, `GameFlow` preloads the current photo with `auto` and the look-ahead photos with `low`; start photos keep `auto`. Add a unit test for the priority on the fake image.
- [x] 5.4 In `supabaseCategorySource.ts`, replace `[...photos].sort(...)` with `photos.toSorted(...)`.

## 6. Verify and record

- [x] 6.1 Run `npm test`, `npm run build`, `npm run lint` and `npx @fission-ai/openspec validate --all --strict`.
- [x] 6.2 Browser check on the local dev server:
  - Tab through setup, and use arrow keys in the pills and the category grid;
  - open help, Tab stays inside, close it and focus returns;
  - in a game, `Esc`, then Tab to «Продовжити гру» + Enter continues the game;
  - `Esc` → `Enter` exits;
  - Enter on the result screen starts a rematch;
  - scrollbars are dark;
  - a long category name and a long answer are clamped;
  - the timer bars shrink correctly on both sides.
- [x] 6.3 Roadmap: add phase 10 `harden-host-and-a11y` (▶ while in progress). After archiving, set ✔, fill the result and summary, and update CLAUDE.md conventions (hotkeys yield to focused buttons, overlays use `inert`).
