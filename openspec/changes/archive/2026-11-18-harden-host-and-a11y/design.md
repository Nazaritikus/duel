# Design: harden-host-and-a11y

## Context

Findings come from a code review plus two read-only UI audits run on 2026-11-18 (Vercel Web Interface Guidelines, Chrome `modern-web-guidance`). Current state:

- **Hotkeys:**
  - `useHostHotkeys` attaches a window `keydown` listener and calls `preventDefault()` for every mapped key.
  - `isEditable` treats every `INPUT` as text entry, radios included.
  - `GameFlow` maps `correct` (→/Enter) to "confirm exit" while the exit dialog is open and to "rematch" on the result screen.
- **Overlays:**
  - `ExitConfirm` (inside `ActiveGame`) and `HostHelp` (inside `SetupScreen`) are `div`s with `role="(alert)dialog"` / `aria-modal`.
  - Each moves focus in, but nothing keeps it there or restores it afterwards.
- **The stage:** it is a fixed 1920×1080 box scaled with `transform: scale()` (`Stage.tsx`). A native `<dialog>` opened with `showModal()` renders in the top layer, outside the transformed box, so it would not scale with the stage.
- **Setup controls:**
  - the pills are `<button role="radio">` without arrow-key handling;
  - the category cards are `aria-pressed` buttons in a `role="group"`.
- **Other gaps:**
  - no `color-scheme` anywhere;
  - `.category-card` is a fixed 96 px tall with an 18 px name and no clamp;
  - `.answer-bar__answer` has no wrapping rules;
  - `.panel__bar` sets `width` every animation frame;
  - `PhotoFrame`'s `<img>` has no priority hint, and `createImagePreloader` creates every image at default priority.

## Goals / Non-Goals

**Goals:**
- Focused buttons keep their native Enter/Space behaviour, and the keyboard-only host flow stays exactly as today.
- Overlays contain focus and restore it on close, with no visual change.
- Setup choices are real radio groups.
- Fix the screen-share visual leaks: light scrollbars, spellcheck squiggles, auto-translate, overflow.
- Reduce per-frame layout work, and give the visible photo network priority over look-ahead images.

**Non-Goals:**
- No visual redesign. Hover states, view transitions and `font-size-adjust` are out.
- Nothing on the admin side; that is the separate change.
- Making «Почати дуель» clickable without a category.

## Decisions

### 1. Hotkeys yield to focused controls
`hotkeyFor` / `appHotkeyFor` get two guards:

- **Text entry only:** `isEditable` becomes "accepts text input". It covers `textarea`, `select`, contenteditable, and `input` of any type except `radio`, `checkbox`, `button`, `submit`, `reset`, `range`, `color` and `file`. Radios are no longer treated as text, so `F` / `M` work while a setup radio is focused.
- **Activation keys:** when the target is a `button`, an `a[href]`, a radio or a checkbox, `Enter` / `NumpadEnter` / `Space` return `null`, so the browser activates the control natively.

**Why not handle Enter inside the dialogs instead:** the bug class is general. Any button on the game or result screens would otherwise be hijacked. Keeping the rule in one pure function keeps it unit-testable.

**Keeping the keyboard-only host flow:**

- **Exit dialog:** focus already starts on «Вийти», so `Esc` then `Enter` presses «Вийти» natively, which confirms. The `correct → onExit` mapping stays for the case where focus is elsewhere, for example after a mouse click on the backdrop.
- **Result screen:** «Реванш» gets focus on mount, so `Enter` presses it natively. `→` still triggers the rematch through the hotkey map.
- **Game screen:** it has no buttons. Focus is normally on `body`, because the setup button that started the game has unmounted, so `Enter` and `Space` keep working as hotkeys.

### 2. Focus containment with `inert`, not `<dialog>`
Native `<dialog>` + `showModal()` is the guide's first choice, but the top layer escapes the scaled stage: the dialog would render at 1:1 in the viewport while the stage is scaled. We use the guide's documented fallback instead:

- **Inert sibling:** each screen renders its regular content in a wrapper that gets `inert` while an overlay is open, and the overlay is a sibling of that wrapper. React 19 supports the boolean `inert` prop.
- **Shared hook:** `useRestoreFocus()` records `document.activeElement` when the overlay mounts. On unmount it calls `focus()` on that element if it is still connected and focusable. It is used by both overlays.
- **`ExitConfirm`:**
  - inside `ActiveGame`, the header, photo and status bar go in the inert wrapper;
  - keeps `role="alertdialog"` + `aria-modal="true"` (correct for a custom modal);
  - focuses «Вийти» on mount, as today.
- **`HostHelp`:**
  - inside `SetupScreen`, the form goes in the inert wrapper;
  - focuses «Закрити» on mount;
  - on close, focus goes back to «Як провести гру» through `useRestoreFocus`.

**Pause overlay:** it is not a dialog and has no controls, so it stays as is.

### 3. Native radio groups styled as pills and cards
- **Option groups:** `Segmented` becomes `<fieldset>` + `<legend>`. Each option is a `<label class="pill">` that wraps a visually hidden `<input type="radio" name=…>` (`.visually-hidden` already exists in `index.css`). The styles change as follows:
  - the selected look moves from `.pill--on` to `.pill:has(:checked)`;
  - the focus ring moves to `.pill:has(:focus-visible)`.
- **Category grid:** it becomes a `<fieldset>` with a visually hidden legend «Категорія». Each card is a `<label>` around a hidden radio named `category`.
- **Behaviour:** arrow keys move and select natively, and Space selects. The setup `<form>`'s submit is untouched.
- **Search filter:** if it hides the selected category, the selection is kept. Today's behaviour is the same, so this is not a regression.
- **Tests:** tests that query `getByRole('button', { name: /Авто/ })` switch to `getByRole('radio', …)`.

**Alternative considered:** a roving `tabIndex` with arrow handlers on the existing buttons. It is more code, and the native inputs also give form semantics for free.

### 4. Dark native controls
- **Colour scheme:**
  - `<meta name="color-scheme" content="dark">` in `index.html` (it applies before CSS loads);
  - `:root { color-scheme: dark; }` in `index.css`;
  - `dark` only, not `light dark`, because the app is dark-only by design.
- **Theme colour:** `<meta name="theme-color" content="#0B0D12">`.

### 5. Text hygiene
- **Spellcheck:** `spellCheck={false}`, `autoCorrect="off"` and `autoCapitalize="words"` on the player names. `spellCheck={false}`, `autoCorrect="off"` and `type="search"` on the category search, wrapped in `<search>`.
- **No translation:** `translate="no"` on the logo, the player-name text in panels and the result cards, and `kbd`. For `kbd`, a global `kbd { }` rule cannot set an HTML attribute, so `HotkeyList` and the inline `<kbd>`s get the attribute. A small `Kbd` component keeps this in one place.
- **Typography:**
  - a U+00A0 non-breaking space between number and unit wherever we format «N с» and «N фото»;
  - «Ім’я» with U+2019.

### 6. Clamping long text
- **Category card name:** `display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; line-height: 1.2`. The card changes from `height: 96px` to `min-height: 96px` so two lines plus the count never clip, and one-line names keep today's 96 px.
- **Answer bar:** the same 2-line clamp at its 40 px size, with `overflow-wrap: anywhere`.

### 7. Timer bar with `transform`
`.panel__bar` gets `width: 100%`, `transform: scaleX(pct)` and `will-change: transform`.

- **Origin:** `transform-origin: left` on the left panel and `right` on the right panel, which replaces today's `justify-content: flex-end`.
- **Rounded ends:** these distort under `scaleX`. That is acceptable at 8 px height. If it is visible, the alternative is `clip-path: inset(0 X 0 0 round 4px)`, which also avoids layout. The choice is made during implementation by looking at the screen.

### 8. Image priority
- **On-screen photo:** the visible `<img>` in `PhotoFrame` gets `fetchPriority="high"`.
- **Preloader:** `createImagePreloader().preload(src, { priority })` gains an optional `'high' | 'low' | 'auto'` (default `auto`), set as `image.fetchPriority` before `src`.
- **Start photos:** they keep `auto`.
- **In-game look-ahead:** the current photo is requested with `auto`, and the next 3 with `low`.
- **Cache hits:** a hit keeps the original request, so priority only applies to the first request. That is fine, because look-ahead images are requested well before they are shown.

### 9. `toSorted`
`supabaseCategorySource` uses `category.photos.toSorted(...)`. The TS lib is ES2023, and every evergreen browser has shipped it since 2023.

## Risks / Trade-offs

- **Hidden radios inside labels:** they must stay focusable. Use `.visually-hidden` (clip), not `display: none`. Verify with Tab in the browser.
- **`inert` while hotkeys keep working:** `inert` does not stop window-level `keydown` listeners, and that is intended. Judging keys in the exit dialog are already filtered in `GameFlow`.
- **`:has()` support:** baseline since Dec 2023. If it were missing, the pills would only lose their selected styling, not their function. Acceptable for a host-controlled desktop browser.
- **Taller category cards:** two-line names make those cards taller than 96 px, so grid rows can differ in height. Rows align to the tallest card, and the grid already scrolls.
- **Native radio arrow keys select immediately:** moving through 40 categories with arrows changes the selection as you go. This is the standard radio behaviour, and Tab still leaves the group in one step.
