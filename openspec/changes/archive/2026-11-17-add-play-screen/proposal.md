# Proposal

## Why

The game engine is complete (phases 1–2) but nothing renders it. The game screen is the core of the product, and it carries the most screen-share constraints (16:9, contrast, no opacity-only states, readable timers). Building it now on mock data lets us play and tune a real duel with the keyboard before the setup flow (phase 4) and Supabase (phases 5–8) exist.

## What Changes

**App shell:**
- routes `/` (temporary home with a link to the demo), `/play` (game on the mock category) and `/admin/*` (stub);
- design tokens as CSS variables;
- Unbounded / Inter / JetBrains Mono fonts.

**Stage:** a fixed 1440×810 (16:9) area, scaled uniformly to fit the window and letterboxed on `#0B0D12`.

**Game screen, per `docs/design/source/Game*.dc.html`:**
- **Header:** DUEL, category name, photo number.
- **Photo:** `object-fit: contain`, vertical photos centred, with a ring in the active player's colour.
- **Status bar:** two player panels showing name, time, tag ("Відповідає" / "Заморожено") and a progress bar.

**States:**
- **Last 10 s:** tenths, a red ring and panel, and the tag "Останні секунди".
- **Correct feedback, 2 s:**
  - green ring and overlay;
  - the correct answer;
  - "Правильно" / "Наступна" tags;
  - who answers next.
- **Wrong / pass feedback, 3 s:**
  - red ring and overlay;
  - the correct answer and "−3 с";
  - "наступне фото через N…";
  - the label "Помилка · штраф" / "Пас · штраф".
- The answer photo replaces the question photo during feedback when there is one.
- **Pause overlay** "ПАУЗА": the photo is not rendered while paused, and both panels show as frozen. Moved here from phase 4 because it is a mode of the same Game artboard.

**Host hotkeys:**
- `→`/`Enter` correct, `X` wrong, `P` pass, `Space` pause/resume;
- keys are matched by physical key, so they work on a Ukrainian layout;
- key auto-repeat is ignored;
- hotkeys are ignored while focus is in an input.

**Game loop:** a `requestAnimationFrame` loop dispatches `tick(performance.now())`. Rendering reads the time from engine selectors.

**Mock category** in `public/mock/`:
- about 12 generated placeholder images (SVG), including vertical photos and photos with an answer photo;
- a JSON manifest with answers.

**Interim, non-normative views** so `/play` can be played start to finish:
- a plain countdown number;
- a plain "game over" panel with the winner and a restart key.

Phase 4 replaces both with the designed Countdown and Result screens.

**Game rules:** no change to `specs/game-engine`. This change only renders the existing rules.

**Out of scope:**
- The setup screen, player names (mock names are used) and the designed countdown and result screens (phase 4).
- `Esc` exit with confirmation (phase 4).
- Preloading (phase 8). The mock images are local and tiny.
- Sounds and fullscreen (phase 9).
- Supabase and admin beyond a route stub.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `game-ui`:
  - **"Game screen":** adds the header and the stage.
  - **"Feedback states":** adds the next-player / next-photo hints and the panel states.
  - **"Host hotkeys":** physical keys, auto-repeat ignored.
  - **"Pause overlay":** a new requirement; the photo is hidden while paused.
  - **"Fixed 16:9 stage":** a new requirement.

## Impact

- **New code:**
  - `src/routes.tsx`;
  - `src/features/play/` (stage, game screen components, hooks, mock data loader);
  - `public/mock/`.
- **Changed:** `src/main.tsx` / `App.tsx` (router), `src/index.css` (tokens), `index.html` (fonts).
- **Tests:** component tests with Testing Library and jsdom, both already installed, plus hook tests. The engine is untouched.
- **No new dependencies.**
