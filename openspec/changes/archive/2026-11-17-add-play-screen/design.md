# Design

## Context

**What exists:**
- `src/game/` is a complete pure engine: `createGame`, `gameReducer`, selectors and `formatTime`.
- The React app is a placeholder `App.tsx`.
- `react-router-dom`, Testing Library and jsdom are installed but unused.
- The TS config has `erasableSyntaxOnly` and `verbatimModuleSyntax`.

**Layout reference:** `docs/design/source/Game.dc.html`, `GameCorrect.dc.html`, `GameWrong.dc.html`, `GameLast10.dc.html` and `GamePause.dc.html` give exact pixel values on the 1440×810 artboard. Tokens are in `docs/design/README.md`.

See proposal.md for scope. Requirements are in this change's `game-ui` delta.

## Goals / Non-Goals

**Goals:**
- The game screen matches the artboards pixel-for-pixel at stage scale 1.
- The screen is a pure function of `(state, now, category, players)`. The engine stays the only place with game logic.
- The data shape matches what phase 8 will load from Supabase, so swapping the source does not touch the components.

**Non-Goals:**
- Responsive layouts. The stage is fixed and scaled.
- The setup, the designed countdown and result screens, and `Esc` (phase 4).
- Image preloading (phase 8).

## Decisions

### 1. Data shape for the play feature
```ts
interface PlayPhoto { id: string; src: string; answerSrc: string | null; answer: string; isVertical: boolean }
interface PlayCategory { id: string; name: string; photos: PlayPhoto[] }
interface Players { names: [string, string] }
```
The engine only sees `photoIds`. The screen looks up `PlayPhoto` by id through a `Map`. `loadMockCategory()` fetches `/mock/category.json`, and phase 8 adds a Supabase loader that returns the same shape.
- *Alternative:* importing the JSON statically. Rejected: a fetch exercises the same async loading path phase 8 needs (loading and error states).

### 2. Stage scaling with a CSS transform
`<Stage>` renders a 1440×810 box with `transform: scale(k)`, where `k = min(innerWidth / 1440, innerHeight / 810)`. The box sits in a full-viewport flex container on `--bg`. A `resize` listener updates `k`, and `computeStageScale(w, h)` is a pure, unit-tested function. All game-screen CSS then uses artboard pixels directly.
- *Alternative:* `vw`/`vh` units or `aspect-ratio` with `cqw` units. Rejected: every size would need converting, and that drifts from the design reference.

### 3. Game loop: one rAF hook, time read through selectors
`useGame(category, players, seed)`:
- owns `useReducer(gameReducer, …, init)` and the "now" value;
- runs a `requestAnimationFrame` loop that dispatches `tick(performance.now())`;
- stops the loop when the phase is `finished`;
- returns `{ state, now, dispatch }`.

The components call `getRemainingMs(state, p, now)` at render. The reducer returns the same object when nothing changed, but `now` changes every frame, so the screen re-renders every frame. That is fine for a small tree.

The hook takes a `now` source and a `requestFrame` function as injectable parameters (defaulting to `performance.now` and `requestAnimationFrame`), so tests drive time without fake timers.
- *Alternative:* `setInterval(100)`. Rejected: tenths would visibly jitter, and the spec mandates rAF.

### 4. Hotkeys use `KeyboardEvent.code`
`useHostHotkeys(handlers)` registers one `keydown` listener on `window` and maps keys like this:

| `KeyboardEvent.code` | Action |
|---|---|
| `ArrowRight`, `Enter`, `NumpadEnter` | correct |
| `KeyX` | wrong |
| `KeyP` | pass |
| `Space` | pause or resume (`Space` also calls `preventDefault`) |

The listener returns early when:
- `event.repeat` is set;
- any modifier key is held;
- the target is an `input`, `textarea`, `select` or `[contenteditable]`.

`code` is the physical key, so the Ukrainian layout (`ч`, `з`) works. The hook is generic, so phase 4 adds `Escape` without touching it.
- *Alternative:* `event.key`. Rejected: it breaks on the Ukrainian layout, and the host likely uses one.

### 5. Components follow the artboard structure
`features/play/`:
- `PlayPage.tsx` (route: loads the category, shows loading/error, mounts the game);
- `GameScreen.tsx`;
- `GameHeader.tsx`;
- `PhotoFrame.tsx` (photo, ring, feedback overlay and answer bar);
- `StatusBar.tsx` and `PlayerPanel.tsx`;
- `PauseOverlay.tsx`;
- `InterimCountdown.tsx` and `InterimResult.tsx`.

**View model.** A pure function `getPanelView(state, player, now)` returns:
- `tone`: `active | frozen | last10 | correct | wrong | next`;
- the label;
- the formatted time;
- `pct`.

All state-to-look mapping lives in this one tested function. The components only map tone to CSS classes.

**Styles.** Plain CSS (`play.css`) with the tokens as CSS variables from `index.css`. Class names follow the elements (`.panel`, `.panel--active` and so on). No CSS-in-JS and no new dependency.

### 6. Copy deviations from the artboards
- **Next player.** The artboard says "хід переходить до Олени" and tags the next panel "Наступна". Both depend on the name's grammatical case and gender, which arbitrary names cannot provide. We use "Наступний хід: <name>" and the tag "Наступний хід". This is recorded in the spec delta.
- **Pause overlay.** The artboard dims the photo at 82%. The spec says the photo is hidden, so the photo element is not rendered while paused. Players must not study the photo during a pause, and partial opacity also violates the screen-share rule.
- **Pause overlay coverage.** The artboard's overlay also dims the status bar, which leaves the frozen times barely readable. The overlay covers the header and photo area only, so both panels stay readable with their stopped times. This was found during the manual browser check.

### 7. Mock category
`public/mock/category.json` lists about 12 photos (category "Демо"). The images are hand-written SVGs in `public/mock/`: a large label and shapes, a few in portrait 9:16 with `isVertical: true`, and at least 2 with a `*.answer.svg` answer photo. They are generated once by a small script committed under `scripts/`, so the set can be regenerated. There are no third-party images, so there are no licensing questions.

**Interim screens.** The countdown shows the starter's name and `getCountdownSeconds`. The result shows the winner or "Нічия", the reason and the stats, and `Enter` restarts with a new seed. They are deliberately unstyled beyond tokens, and phase 4 replaces them.

### 8. Routing
`src/routes.tsx` uses `createBrowserRouter`:
- `/` is a temporary home: title and a "Демо-гра" link;
- `/play` is the game on the mock category;
- `/admin/*` is a stub "Адмінка — скоро".

Player names in this phase are fixed to "Гравець 1" and "Гравець 2". `firstPlayer` is 0 and the seed is `Date.now()`.

### 9. Tests
- **Vitest environment.** Component and hook tests opt in with `// @vitest-environment jsdom` at the top of the file. Engine tests keep running in Node.
- **Setup.** A `src/test/setup.ts` with `@testing-library/jest-dom` is registered in `vite.config.ts` `test.setupFiles`.
- **Pure functions:** `computeStageScale` and `getPanelView` cover every tone, including last 10 s and feedback.
- **Hotkeys:** `code` mapping, repeat ignored, input focus ignored.
- **Screen (`GameScreen` with an injected clock):**
  - correct → green state with the next player;
  - wrong → "Помилка · штраф", "−3 с" and the countdown;
  - answer photo replaces the question photo;
  - pause hides the photo;
  - last 10 s shows tenths.

## Risks / Trade-offs

- **[Re-render every frame]** → The tree is small. If profiling shows jank, split the timer text into a memoised component that alone subscribes to `now`.
- **[A transform-scaled stage can blur text at non-integer scales]** → Use `transform-origin: top left` on a wrapper sized by the scale, which keeps the layout crisp in Chrome. Verify visually at 1280×720 and 1920×1080.
- **[Google Fonts load late on first visit, causing a flash]** → Use `display=swap`. The fallbacks are system-ui and monospace. Self-hosting can come in phase 9 if it matters on stream.
- **[jsdom has no layout and no real rAF]** → Inject the time source and frame scheduler into `useGame`, and test layout math as pure functions. Visual parity is checked manually against the artboards in the browser, which is the last task.
