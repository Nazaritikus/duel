# Tasks

## 1. Data: catalog, source, settings memory

- [x] 1.1 Extend `scripts/generate-mock.mjs` to write `public/mock/catalog.json` with 3 categories ("Фігури та кольори" 12, "Цифри" 10, "Стрілки" 8), then regenerate. Verify that the files exist and the manifest test parses every category.
- [x] 1.2 Add `CategorySummary`, the `CategorySource` interface and `mockCategorySource` (`listCategories`, `loadCategory`), replacing `mockCategory.ts`. Verify with tests: list counts, load by id, unknown id rejects, HTTP error rejects.
- [x] 1.3 Add `setupStorage` (`load`/`save`, key `duel.setup.v1`, validation, defaults, try/catch). Verify with tests: round trip, invalid values fall back to defaults, a throwing `localStorage` does not throw.
- [x] 1.4 Add the `pluralUk(n, forms)` helper. Verify with tests: 1 / 2 / 5 / 11 / 21 / 22 / 25 for "помилка/помилки/помилок".

## 2. Setup screen

- [x] 2.1 Build `SetupScreen` per `Main.dc.html`:
  - names (max 20);
  - category grid with search and scroll;
  - time / penalty / starter radio groups;
  - "Почати дуель" (disabled without a category, loading state);
  - list-load error with a retry.

  Verify with component tests for "Search", "Empty name" (submits "Гравець 2"), start disabled until a category is picked, and pre-fill from storage ("Settings remembered").

## 3. Countdown and result screens

- [x] 3.1 Build `CountdownScreen` per `Countdown.dc.html`: category header, "Починає", the starter's name and ring in their colour, frozen panels with full times; it shows the pause overlay when paused. Verify with component tests for "Random starter shown" (player 2's colour and name) and the 3 → 2 → 1 number.
- [x] 3.2 Build `ResultScreen` per `Result.dc.html`:
  - "Перемога" / "Нічия";
  - reason and remaining time;
  - stat cards with plural labels;
  - "Реванш" and "Інша категорія".

  Verify with component tests for timeout, photos exhausted and draw, plus "Stats" (14 правильно, 3 помилки, 1 пас).

## 4. Flow, hotkeys and exit

- [x] 4.1 Add `Escape` → `'exit'` to `useHostHotkeys`. Verify with an extended hotkey test.
- [x] 4.2 Implement `GameFlow`:
  - setup → load category → game (countdown / game / result by engine phase);
  - rematch with a new seed;
  - "Інша категорія" back to setup;
  - settings saved on start.

  Wire `/` to `GameFlow` with the mock source. Remove `/play`, `PlayPage`, `InterimViews` and the home page.

  Verify with a component test for the full flow: setup → countdown → turns → result → "Реванш" (new countdown, same names) → "Інша категорія" (setup pre-filled).
- [x] 4.3 Implement `ExitConfirm` and the key routing:
  - `Esc` pauses and opens the dialog;
  - `Enter` exits;
  - `Esc` cancels and resumes only if the dialog paused the game;
  - other keys are ignored while it is open.

  Verify with tests for "Confirm exit", "Cancel exit" (time unchanged), "Cancel keeps an earlier pause" and "Judging keys ignored in the dialog".
- [x] 4.4 Add a 5 s penalty test at the game level: "−5 с" is shown, the next photo arrives after 5 s and 20.0 → 15.0. Verify that the test passes in `GameScreen`/flow tests.

## 5. Verification

- [x] 5.1 Manual check in the browser at 1920×1080: play a full duel on `/` with names, 90 s and a 5 s penalty, random start, rematch, another category, `Esc` → cancel / confirm. Compare setup, countdown and result with the artboards. Verify by fixing or recording each deviation in design.md.
- [x] 5.2 Update the `docs/roadmap.md` phase 4 bullets if the scope changed. Verify that `npm run build`, `npm run lint` and `npm test` all pass.

## Workflow follow-up

- Run `npx @fission-ai/openspec validate --all --strict`, then `/openspec-archive-change`.
- Update `docs/roadmap.md`: phase 4 → `✔ <date>`, fill the "Result" column and add the phase summary.
