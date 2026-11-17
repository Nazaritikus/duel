# Tasks

## 1. App shell

- [x] 1.1 Add the fonts to `index.html` and the full token set from `docs/design/README.md` to `src/index.css`. Remove the placeholder styles. Verify with `npm run build`.
- [x] 1.2 Add `src/routes.tsx` (`/` temporary home with a "Демо-гра" link, `/play`, `/admin/*` stub) and wire `RouterProvider` in `main.tsx`; remove `App.tsx`. Verify that the dev server serves all three routes.
- [x] 1.3 Configure component tests:
  - add `test.setupFiles` in `vite.config.ts`;
  - add `src/test/setup.ts` with `@testing-library/jest-dom`;
  - use the jsdom docblock convention.

  Verify with a smoke test that renders the home route.

## 2. Stage and mock data

- [x] 2.1 Implement `<Stage>` (1440×810, `transform: scale`, letterboxed) with a pure `computeStageScale(w, h)`. Verify with unit tests for the spec scenarios "Wide window" (2560×1080 → 1920×1080) and "Narrow window" (1280×1024 → 1280×720).
- [x] 2.2 Add `scripts/generate-mock.mjs`, which writes about 12 SVG photos (≥ 2 vertical, ≥ 2 with `*.answer.svg`) and `public/mock/category.json`. Run it and commit the output. Verify that the files exist and the JSON matches `PlayCategory`.
- [x] 2.3 Add the `PlayPhoto` / `PlayCategory` types and `loadMockCategory()`. Verify with a test that it parses the manifest (mocked fetch) and rejects on an HTTP error.

## 3. Game loop and hotkeys

- [x] 3.1 Implement `useGame(category, players, seed, { now, requestFrame })`: the reducer, the rAF tick loop that stops on `finished`, and `dispatch`. Verify with a hook test that, with an injected clock, a tick advances the countdown into the first turn and the loop stops after finish.
- [x] 3.2 Implement `useHostHotkeys(handlers)` on `KeyboardEvent.code`:
  - `ArrowRight`/`Enter`/`NumpadEnter`, `KeyX`, `KeyP`, `Space` (with `preventDefault`);
  - ignore repeat, modifiers and editable targets.

  Verify with tests for the spec scenarios "Typing a name", "Ukrainian keyboard layout" (`code: 'KeyX'`, `key: 'ч'`) and "Held key".

## 4. Game screen

- [x] 4.1 Implement `getPanelView(state, player, now)`, returning tone, label, time and pct for active / frozen / last10 / correct / next / wrong / pass. Verify with unit tests for each tone:
  - the tenths rule only for the active player under 10 s;
  - frozen shows `#C4C9D2` styling via its tone, not opacity.
- [x] 4.2 Build `GameHeader`, `PlayerPanel`, `StatusBar` and `PhotoFrame` (photo with `object-fit: contain`, ring in the active colour, red in the last 10 s) to the `Game.dc.html` measurements. Verify with component tests for the spec scenarios "Header" ("Категорія: … · фото 7") and "Frozen player readable".
- [x] 4.3 Add the feedback rendering to `PhotoFrame` and the panels:
  - **correct:** green overlay, answer, "Наступний хід: <name>";
  - **wrong / pass:** red overlay, answer, "−3 с", "наступне фото через N…";
  - the answer photo replaces the question photo.

  Verify with component tests for "Correct feedback", "Pass feedback" and "Answer photo".
- [x] 4.4 Add `PauseOverlay`, which does not render the photo while paused. Verify with the tests "Photo hidden while paused" and "Resume".

## 5. Play page

- [x] 5.1 Implement `PlayPage`:
  - load the mock category, with a loading state and an error state that has a retry;
  - create the game, wire the hotkeys to `dispatch`;
  - render the interim countdown / `GameScreen` / interim result, where `Enter` on the result restarts with a new seed.

  Verify with a component test: load → countdown → `Enter` correct → feedback, all driven by the injected clock.
- [x] 5.2 Do a manual check in the browser at 1920×1080 and 1280×720:
  - play `/play` to the end with the keyboard;
  - compare turn, last 10 s, correct, wrong, pass and pause against the `docs/design/source/Game*.dc.html` artboards.

  Verify by recording any visual deviation and fixing it or noting it in the design.

## 6. Wrap-up

- [x] 6.1 Update `docs/roadmap.md` phase 3 / 4 bullets (pause overlay moved into phase 3). Verify that `npm run build`, `npm run lint` and `npm test` all pass.

## Workflow follow-up

- Run `npx @fission-ai/openspec validate --all`, then `/openspec-archive-change`.
- Update `docs/roadmap.md`: phase 3 → `✔ <date>`, fill the "Result" column and add the phase summary.
