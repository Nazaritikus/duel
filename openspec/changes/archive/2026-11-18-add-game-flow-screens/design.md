# Design

## Context

**Phase 3 left:**
- `PlayPage` on `/play`, which loads one mock category and owns the seed. It renders interim views for the countdown and finished phases, and `GameScreen` otherwise.
- `useGame({ photoIds, seed, settings, clock })`, already parameterised by `Settings`.
- `useHostHotkeys` on `KeyboardEvent.code`.
- `Stage` 1440×810.

The engine supports `timePerPlayerMs`, `penaltyMs` and `firstPlayer` already. Nothing in `src/game` needs to change.

**Layout reference:** `docs/design/source/Main.dc.html`, `Countdown.dc.html` and `Result.dc.html`. See proposal.md for scope; requirements are in this change's deltas.

## Goals / Non-Goals

**Goals:**
- One flow on `/`, with screens as plain components and transitions in one place.
- The category source is an interface, so phase 8 only adds a Supabase implementation.
- Every screen fits the 16:9 stage and follows the screen-share rules: contrast, no opacity-only state.

**Non-Goals:**
- Deep links to a running game or URL state per screen. A reload during a game returns to setup, which is acceptable for a host tool.
- Mouse-free setup. Setup is filled before sharing, and buttons are fine there.

## Decisions

### 1. Flow as a small state machine in `GameFlow`
```ts
type Flow =
  | { screen: 'setup' }
  | { screen: 'game'; setup: GameSetup; category: PlayCategory; seed: number }
```
`GameSetup = { names, categoryId, timePerPlayerMs, penaltyMs, firstPlayer }`.

**Inside `game`:**
- **Countdown, game and result:** the engine phase picks the screen.
  - `countdown` → `CountdownScreen`;
  - `turn`, `feedback` or `paused` → `GameScreen`;
  - `finished` → `ResultScreen`.
- **Rematch:** a new `seed` remounts `ActiveGame` via `key`.
- **"Інша категорія" and a confirmed exit:** both go to `setup`.

**Why:** the engine already models countdown / finished, so the flow only adds setup and how to leave. There is no router state to keep in sync, and a reload simply lands on setup.

*Alternative:* separate routes (`/setup`, `/game`). Rejected: game state cannot survive a navigation without a store, and nothing benefits from URLs here.

### 2. `CategorySource` interface with a mock implementation
```ts
interface CategorySummary { id: string; name: string; photoCount: number }
interface CategorySource {
  listCategories(): Promise<CategorySummary[]>
  loadCategory(id: string): Promise<PlayCategory>
}
```
- `mockCategorySource` reads `/mock/catalog.json`, which the generator writes: 3 categories with their photos.
- `GameFlow` receives the source as a prop, and the route passes the mock. Phase 8 passes a Supabase source.
- Categories are listed when setup mounts. The chosen category is loaded on "Почати дуель", and the button shows a loading state.
- On failure, the setup screen shows an error with a retry.

**Mock catalog:**

| Category | Photos |
|---|---|
| "Фігури та кольори" | the existing 12 |
| "Цифри" | 10, digits drawn as SVG |
| "Стрілки" | 8, arrows in directions |

### 3. Settings memory
- `setupStorage.load()` / `save(setup)` keep `{ names, categoryId, timePerPlayerMs, penaltyMs, firstPlayer }` under the `localStorage` key `duel.setup.v1`.
- Values are validated on load. Unknown or invalid values fall back to the defaults (60 s, 3 s, player 1, empty names), and a `categoryId` that is no longer listed is ignored.
- Writes happen on start. Every access is wrapped in try/catch: private mode must not break setup.

### 4. Hotkeys: `Escape` and a modal layer
`useHostHotkeys` maps `Escape` to `'exit'`. In the flow, one handler routes keys by screen:

| Screen | Keys |
|---|---|
| Setup | Hotkeys off. Inputs are ignored by the hook anyway, and Enter in the form submits it. |
| Countdown / game | Phase 3 mapping, plus `Esc`, which opens the confirm (it first records whether the game was already paused, then dispatches `pause`). |
| Exit confirm open | `Enter` exits, `Esc` cancels (dispatches `resume` only if this dialog paused the game). Everything else is ignored. |
| Result | `Enter` = Реванш. The buttons work with the mouse too. |

The exit confirm is a component inside the stage (`role="alertdialog"`, focus on the "Вийти" button) and never `window.confirm`. A browser dialog blocks the page, our hotkeys and the rAF loop, and it shows on the shared screen.

### 5. Result screen data
- **Headline:**
  - with a winner: kicker "Перемога" and the winner's name in their colour;
  - with a draw: kicker "Фото закінчились" and the headline "Нічия".
- **Reason line:**
  - timeout: "Час суперника вичерпано · залишилось 0:14";
  - photos exhausted with a winner: "Фото закінчились · залишилось 0:14";
  - draw: "Однаковий час у обох".

  The time is the winner's remaining time from `getRemainingMs` at finish, formatted with tenths when under 10 s.
- **Cards:** the numbers come from `state.stats`, with labels from `pluralUk(n, ['правильно', 'правильно', 'правильно'])`, `['помилка', 'помилки', 'помилок']` and `['пас', 'паси', 'пасів']`. The winner's card has a border in their colour; the loser's card uses the frozen styling, with the name in `--text-muted`.
- **Header:** "<category> · N фото", where N is the number of photos shown (`photoIndex + 1`, capped at the photo count). This replaces the design's game duration (see proposal).
- **Copy deviations:** the kicker "Переможець" becomes "Перемога", and "у Назара більше часу" becomes "залишилось m:ss". Both avoid gender and case on arbitrary names, as in phase 3.

### 6. Setup screen details
- **Name inputs:** `maxLength=20`, which keeps panel layouts intact. Labels are coloured with the player colours; the active input gets a border in the player colour.
- **Category grid:** 4 columns, `max-height: 208px` with scroll. A card is a `button` with `aria-pressed`. The selected card is shown with a white 2px border and a lighter surface, never with opacity.
- **Search:** a case-insensitive `includes` on the name, trimmed. "Нічого не знайдено" appears when the list is empty.
- **Segmented controls** for time, penalty and starter: radio groups (`role="radiogroup"`) styled as the artboard's pills.
- **"Почати дуель":** disabled until a category is selected; shows "Завантаження…" while the category loads.

### 7. Penalty in the UI
`PhotoFrame` already renders `−{penaltyMs / 1000} с` and a countdown from `endsAt`, so a 5 s penalty works without changes. Only tests are added.

### 8. Removals
- `InterimViews.tsx`, `PlayPage.tsx` and the `/play` route are removed.
- `pages.tsx` keeps only the admin stub.
- `mockCategory.ts` becomes `mockCategorySource.ts`.

### 9. Findings from the manual browser check
- **Exit dialog secondary button.** "Продовжити гру" had the same fill as the dialog box. It gets `--border-panel` inside the dialog.
- **Result kicker colour.** The artboard always shows "ПЕРЕМОГА" in player 1's amber. It now follows the winner's colour, and a draw shows it in `--text-muted`.

## Risks / Trade-offs

- **[A reload during a game loses it]** → Accepted for MVP. Setup is remembered, so a new game is two clicks away.
- **[`localStorage` contents can be stale or tampered with]** → Strict validation on load, with fallback to defaults.
- **[`Enter` is both "correct" in the game and "confirm" in the dialog]** → The dialog layer consumes keys first, and the game handler is not called while it is open. A test covers this.
- **[The countdown can be paused or exited]** → `CountdownScreen` shows the pause overlay when the phase is paused with `resume.type === 'countdown'`, using the same `PauseOverlay` component.
