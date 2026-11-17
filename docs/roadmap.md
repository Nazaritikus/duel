# Roadmap

One phase = one OpenSpec change (`/openspec-propose` → `/openspec-apply-change` → `/openspec-archive-change`).
Requirements live in `openspec/specs/`; this file only tracks order and status.

**Status legend:** ✔ done · ▶ in progress · ○ next / not started

| # | Phase (OpenSpec change) | Status | Result |
|---|---|---|---|
| 1 | `add-game-engine-core` | ✔ 2026-11-17 | Pure engine: chess clocks, turns, correct/wrong/pass feedback, time-out |
| 2 | `complete-game-engine-rules` | ✔ 2026-11-17 | Countdown, pause, seeded shuffle, photos exhausted & draw, stats, time formatting |
| 3 | `add-play-screen` | ✔ 2026-11-17 | `/play` playable end to end with the keyboard on mock data, matches the Game artboards |
| 4 | `add-game-flow-screens` | ○ | Setup → countdown → game → result → rematch. **Offline MVP** |
| 5 | `add-supabase-foundation` | ○ | Schema, RLS, storage, types, seed, Vercel preview |
| 6 | `add-admin-categories` | ○ | Admin login, categories CRUD, publish validation |
| 7 | `add-admin-photo-management` | ○ | Bulk upload, compression, answer photos, edit/delete |
| 8 | `connect-game-to-supabase` | ○ | Game on published categories with preloading |
| 9 | `polish-host-experience` | ○ | Sounds, fullscreen, host cheat sheet, production deploy |

```
1 ─► 2 ─► 3 ─► 4  (offline MVP)
                │
5 ─► 6 ─► 7 ────┤
                ▼
           8 ─► 9
```

## Phase details

### 1. `add-game-engine-core` — ✔ archived as `2026-11-17-add-game-engine-core`
- `src/game/`: types, clock, reducer, public index; 18 Vitest tests
- API: `createGame(photoIds, now, settings?)`, `gameReducer(state, action)`, `getRemainingMs(state, player, now)`, `getCurrentPhotoId(state)`
- Added requirement "Host input outside an active turn" to `game-engine`

### 2. `complete-game-engine-rules` — ✔ archived as `2026-11-17-complete-game-engine-rules`
- **Summary.** `src/game/` gained:
  - countdown, pause/resume, a seeded shuffle;
  - the photos-exhausted ending with a draw;
  - per-player stats;
  - `format.ts`.

  There are 55 Vitest tests, and every `game-engine` scenario has one.
- **API:**
  - `createGame({ photoIds, now, seed, settings? })`, which starts in `countdown`;
  - `gameReducer` with the new `pause` / `resume` actions;
  - `getRemainingMs`, `getCurrentPhotoId`, `getCountdownSeconds`;
  - `formatTime(ms, { tenths })`, `isLastSeconds`.

  The `finished` phase has `winner: 0 | 1 | null` and `reason: 'timeout' | 'photos_exhausted'`; `state.stats` holds the per-player stats.
- **Spec changes in `game-engine`:**
  - the countdown is 3 s, and a random starter is fixed at creation;
  - pause works during the countdown, and judgements are ignored while paused or counting down;
  - the shuffle is reproducible per seed;
  - photos exhausted is evaluated after the last feedback, so the penalty still applies, and a draw compares truncated tenths.
- **Spec change in `game-ui`:** the timer truncates and never rounds up.

**Original plan:**
- `countdown` phase (3-2-1; first player = player 1 or random)
- `pause` / `resume` from any active state; feedback timer suspended too
- Seedable shuffle without repeats
- Photos exhausted → more remaining time wins; equal to 0.1 s → draw
- Stats per player: correct, wrong, pass
- Time formatting helper (`m:ss`, tenths in the last 10 s)
- Done when every scenario in `openspec/specs/game-engine/spec.md` has a test
- Prompt: `/openspec-propose "complete game engine rules: countdown, pause, shuffle, photos exhausted and draw, stats, time formatting"`

### 3. `add-play-screen` — ✔ archived as `2026-11-17-add-play-screen`
- **Summary.**
  - App shell: router (`/`, `/play`, `/admin/*` stub), design tokens, fonts.
  - `Stage`: 1440×810, scaled and letterboxed.
  - Game screen with all states: turn, last 10 s, correct, wrong/pass, answer photo, pause.
  - Interim countdown and result views.
  - Mock category of 12 generated SVGs (`scripts/generate-mock.mjs`).
  - 92 Vitest tests in total.
- **API (`src/features/play`):**
  - `PlayPage({ loadCategory, clock, names, initialSeed })`;
  - `useGame({ photoIds, seed, settings, clock })` → `{ state, now, command }`;
  - `useHostHotkeys(onHotkey)`, which matches `KeyboardEvent.code`;
  - `getPanelView(state, player, now)`;
  - `computeStageScale(w, h)`;
  - the `PlayCategory` / `PlayPhoto` types and `loadMockCategory()`.
- **Spec changes in `game-ui`:**
  - added "Fixed 16:9 stage" and "Pause overlay" (the photo is not rendered while paused);
  - "Game screen" gains the header and the photo frame;
  - "Feedback states" gains the next-player and next-photo hints, with gender-neutral copy;
  - "Host hotkeys" match physical keys and ignore auto-repeat.
- **Deviations from the artboards:**
  - the pause overlay leaves the status bar readable;
  - "Наступний хід: <ім'я>" replaces the case-dependent copy.

**Original plan:**
- App shell: routing (`/`, `/play`, `/admin/*` stub), fonts, design tokens
- 16:9 `Stage` scaled to the window
- Game screen: photo (`object-fit: contain`), status bar, active / "Заморожено", last-10-s state
- Feedback states (green 2 s, red 3 s "Помилка" / "Пас"), answer photo when present
- Pause overlay (`Space`), photo hidden while paused — moved here from phase 4 (same Game artboard)
- Interim countdown and result views so `/play` runs end to end (replaced in phase 4)
- `useGameLoop` (rAF → `tick`), `useHostHotkeys` (ignored while focus is in an input)
- Mock category in `public/mock/`
- Done when `/play` can be played to the end with the keyboard and matches the design
- Prompt: `/openspec-propose "play screen: stage 16:9, photo, status bar, feedback states, host hotkeys, mock category"`

### 4. `add-game-flow-screens` — offline MVP
- Setup (names, category with search, 45/60/90 s, who starts), designed countdown screen, `Esc` exit with confirmation
- Result: winner / draw, reason, stats, "Реванш", "Інша категорія"
- Component tests for Setup → Game → Result
- Done when a full duel with rematch can be played on mock data
- Prompt: `/openspec-propose "game flow: setup, countdown, result and rematch, esc exit"`

### 5. `add-supabase-foundation`
- Migrations `categories`, `photos` (`answer_storage_path`, `is_vertical`, `position`), indexes, `updated_at` trigger
- RLS: anon reads published only; admin-only writes; `photos` bucket policies
- Generated TS types, `src/lib/supabase.ts`, seed with the mock category, Vercel preview deploy
- Done when migrations apply to a clean DB, anon writes are rejected, preview deploy opens
- Prompt: `/openspec-propose "supabase foundation: schema, RLS, storage bucket, generated types, seed, vercel deploy"`

### 6. `add-admin-categories`
- Magic-link login, `RequireAdmin` guard, logout
- Categories list (photo count red below 60, status, date), create/edit, publish/unpublish with validation
- Done when publishing is blocked by validation with a visible reason
- Prompt: `/openspec-propose "admin auth and categories: magic link, guard, list, create/edit, publish validation"`

### 7. `add-admin-photo-management`
- Drag & drop bulk upload with progress, client-side compression (~1600 px WebP), `is_vertical`
- File name → answer; `<name>.answer.<ext>` → answer photo
- Card grid: inline answer edit, add/replace/remove answer photo, "вертикальне" badge, delete with storage files
- Unit tests for file-name parsing and pairing
- Done when a 60+ photo category can be filled in minutes and published
- Prompt: `/openspec-propose "admin photo management: bulk upload, compression, filename answers, answer photos, edit and delete"`

### 8. `connect-game-to-supabase`
- Setup lists published categories from Supabase; photos loaded before start
- Preload next 2–3 photos plus answer photos (`img.decode()`)
- Loading / error states; mock mode kept behind an env flag
- Done when a duel on a published category has no delay between photos
- Prompt: `/openspec-propose "connect game to supabase: published categories, photo loading, preloading with answer photos"`

### 9. `polish-host-experience`
- Sounds (correct, wrong, last-10-s ticking, game over) with mute
- Fullscreen, hotkeys cheat sheet and host instructions on the setup screen
- Production deploy, test game over Zoom / Meet
- Done when a real test game over a video call has been played
- Prompt: `/openspec-propose "polish host experience: sounds, fullscreen, hotkeys cheat sheet, host instructions, production deploy"`
