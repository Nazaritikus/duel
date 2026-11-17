# Proposal

## Why

After phase 3 a duel can be played, but only on `/play`, with fixed player names, fixed settings and interim views. To run a real duel on a call, the host needs four more things:
- to enter names and pick a category and settings;
- to see a proper countdown and result;
- to start a rematch;
- to leave a game safely.

This phase completes the **offline MVP**: a full duel with rematch on mock data, ready to try on a call before Supabase exists.

## What Changes

**One game flow on `/`:** setup → countdown → game → result → rematch or another category.
- `/play` and the interim countdown and result views are removed.
- `/admin/*` stays a stub.

**Setup screen, per `Main.dc.html`:**
- **Players:** two name inputs. An empty name falls back to "Гравець 1" / "Гравець 2".
- **Category:** a grid of mock categories with photo counts, search and scroll.
- **Time per player:** 45 / 60 / 90 s.
- **Penalty:** 3 / 5 s.
- **Who starts:** "Гравець 1" / "Випадково".
- **Start:** a "Почати дуель" button.
- The last names and settings are remembered in `localStorage` across reloads.

**Countdown screen, per `Countdown.dc.html`:**
- the category in the header;
- "Починає" with the starter's name in their colour;
- a 3-2-1 ring in the starter's colour;
- both frozen panels with full times.

**Result screen, per `Result.dc.html`:**
- the winner, or "Нічия";
- the reason and the winner's remaining time;
- per-player stats: correct, wrong, pass;
- **"Реванш":** same players, category and settings, new shuffle;
- **"Інша категорія":** back to setup with names and settings kept.

**`Esc` exits to the menu with confirmation:**
- an in-stage dialog "Вийти в меню?" pauses the game;
- `Enter` confirms and returns to setup;
- `Esc` cancels and resumes, unless the host had already paused.

No browser `confirm()` is used: it blocks the page and shows on stream.

**Mock catalog:** the generator produces 3 small categories so search and selection can be exercised. A `CategorySource` interface (list categories, load one) lets phase 8 plug in Supabase.

**Game rules (explicit change in `specs/game-engine`):** the wrong/pass penalty length becomes a setup choice of 3 s or 5 s instead of a fixed 3 s. The default remains 3 s. The engine already takes `penaltyMs` as a setting; only the requirement text changes.

**Out of scope:**
- Supabase, published/draft filtering on real data (phase 8; the mock catalog is all "published").
- Sounds, fullscreen, the host cheat sheet (phase 9).
- Game duration in the result header: the design shows "3 хв 12 с", but measuring it needs pause bookkeeping. The header shows the number of photos played instead.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- **`game-engine`:** "Wrong answer or pass" now uses a penalty of 3 s or 5 s, chosen in setup.
- **`game-ui`:**
  - "Setup screen" gains the penalty choice, name fallback, remembered settings and the start rules;
  - "Feedback states" shows the chosen penalty;
  - "Result screen" gains the remaining time, the stats and the actions, with gender-neutral copy;
  - new: "Countdown screen";
  - new: "Exit to menu".

## Impact

- **New code in `src/features/play/`:**
  - `SetupScreen`, `CountdownScreen`, `ResultScreen`, `ExitConfirm`;
  - a `GameFlow` state machine component;
  - a `CategorySource` with a mock implementation;
  - `setupStorage`.
- **Changed:**
  - `routes.tsx`: `/` becomes the flow, `/play` and the home page are removed;
  - `useHostHotkeys`: adds `Escape`;
  - `PlayPage`: becomes `GameFlow`;
  - `InterimViews`: deleted;
  - `scripts/generate-mock.mjs`: generates a catalog.
- **Tests:** component tests for setup → countdown → game → result → rematch and for the exit confirmation, plus unit tests for the storage and the Ukrainian plural helper.
- **No new dependencies.**
