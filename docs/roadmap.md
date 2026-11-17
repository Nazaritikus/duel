# Roadmap

One phase = one OpenSpec change (`/openspec-propose` → `/openspec-apply-change` → `/openspec-archive-change`).
Requirements live in `openspec/specs/`; this file only tracks order and status.

**Status legend:** ✔ done · ▶ in progress · ○ next / not started

| #   | Phase (OpenSpec change)      | Status       | Result                                                                                                                       |
| --- | ---------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| 1   | `add-game-engine-core`       | ✔ 2026-11-17 | Pure engine: chess clocks, turns, correct/wrong/pass feedback, time-out                                                      |
| 2   | `complete-game-engine-rules` | ✔ 2026-11-17 | Countdown, pause, seeded shuffle, photos exhausted & draw, stats, time formatting                                            |
| 3   | `add-play-screen`            | ✔ 2026-11-17 | `/play` playable end to end with the keyboard on mock data, matches the Game artboards                                       |
| 4   | `add-game-flow-screens`      | ✔ 2026-11-18 | Full duel with rematch on `/` (setup → countdown → game → result), mock catalog. **Offline MVP**                             |
| 5   | `add-supabase-foundation`    | ✔ 2026-11-18 | Schema + RLS + private storage on local and cloud Supabase, policy tests, seed, types, Vercel preview                        |
| 6   | `add-admin-categories`       | ✔ 2026-11-18 | Magic-link admin login with allowlist guard, categories list/editor, publish rule in UI and DB                               |
| 7   | `add-admin-photo-management` | ✔ 2026-11-18 | Bulk upload (WebP ≤1600 px, answers from file names), photo grid editing, covers, production on https://duel-sand.vercel.app |
| 8   | `connect-game-to-supabase`   | ✔ 2026-11-18 | Game plays published Supabase categories; first photos decoded before start, next 3 preloaded; mock behind a flag            |
| 9   | `polish-host-experience`     | ○            | Sounds, fullscreen, host cheat sheet, test game over a call                                                                  |

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

### 4. `add-game-flow-screens` — ✔ archived as `2026-11-18-add-game-flow-screens` — offline MVP

- **Summary.**
  - `GameFlow` on `/`: setup → countdown → game → result → rematch / another category.
  - Setup screen: names, category search, 45/60/90 s, penalty 3/5 s, who starts, settings remembered in `localStorage`.
  - Countdown and result screens per the artboards.
  - `Esc` exit with an in-page confirmation.
  - Mock catalog of 3 categories.
  - 135 Vitest tests in total.
- **API (`src/features/play`):**
  - `GameFlow({ source, clock, storage, newSeed })`;
  - the `CategorySource` interface (`listCategories`, `loadCategory`) with `createMockCategorySource()`;
  - `loadSetup` / `saveSetup` / `displayNames` (`duel.setup.v1`);
  - `pluralUk`;
  - `useHostHotkeys(onHotkey, enabled)` with `'exit'`.
- **Spec changes:**
  - **`game-engine`:** the penalty is 3 or 5 s, chosen in setup.
  - **`game-ui`:**
    - "Setup screen" gains the penalty choice, name fallback, remembered settings and the start rules;
    - "Feedback states" shows the chosen penalty;
    - "Result screen" gains the remaining time, stats and actions, with gender-neutral copy;
    - added "Countdown screen" and "Exit to menu".
- **Deviations from the artboards:**
  - the result header shows the photo count instead of the game duration;
  - "Перемога" and "залишилось m:ss" replace the gendered copy;
  - the result kicker uses the winner's colour.

**Original plan:**

- Setup (names, category with search, 45/60/90 s, penalty 3/5 s, who starts, remembered settings), designed countdown screen, `Esc` exit with in-page confirmation
- One flow on `/` (setup → countdown → game → result); `/play` and interim views removed; mock catalog of 3 categories behind a `CategorySource` interface
- Result: winner / draw, reason, stats, "Реванш", "Інша категорія"
- Component tests for Setup → Game → Result
- Done when a full duel with rematch can be played on mock data
- Prompt: `/openspec-propose "game flow: setup, countdown, result and rematch, esc exit"`

### 5. `add-supabase-foundation` — ✔ archived as `2026-11-18-add-supabase-foundation`

- **Summary.**
  - 5 migrations: schema, triggers, `admins` + `private.is_admin()`, RLS, private bucket `photos`.
  - Applied to the local Docker stack and to the cloud project `Duel`; advisors are clean.
  - 19 RLS / storage policy tests (`npm run test:db`); 137 unit tests.
  - Mock catalog seeded locally and in the cloud.
  - Vercel project `duel` with a preview deploy (behind Vercel auth).
- **API / tooling:**
  - `getSupabase()` (lazy, typed by `src/lib/database.types.ts`);
  - npm scripts `db:start|stop|reset|types|seed|grant-admin`, `test:db`;
  - `scripts/supabase-env.mjs` (local keys from `supabase status`, `--remote` from `.env`);
  - `docs/setup.md`;
  - `vercel.json` (SPA rewrite);
  - env vars `VITE_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_SECRET_KEY`.
- **Spec changes in `admin`:**
  - "Admin authentication": an allowlist of one or more admins, with scenarios for drafts, non-admins and a second admin;
  - added "Content storage layout" (private bucket, paths, signed URLs);
  - added "Data integrity" (cascade delete, unique position, category last-update).
- **Notes:**
  - the production deploy moved to phase 7;
  - Supabase CLI v3 needs `--remote` for cloud commands.

**Original plan:**

- Migrations `categories`, `photos` (`answer_storage_path`, `is_vertical`, `position`), indexes, `updated_at` trigger
- RLS: anon reads published only; admin-only writes (admin = `admins` allowlist + `is_admin()`); private `photos` bucket with folder-based policies
- Local Docker stack for dev and RLS tests (`npm run test:db`), cloud project for the preview; CLIs as devDependencies
- Generated TS types, `src/lib/supabase.ts`, seed with the mock category, Vercel preview deploy
- Done when migrations apply to a clean DB, anon writes are rejected, preview deploy opens
- Prompt: `/openspec-propose "supabase foundation: schema, RLS, storage bucket, generated types, seed, vercel deploy"`

### 6. `add-admin-categories` — ✔ archived as `2026-11-18-add-admin-categories`

- **Summary.**
  - Magic-link login on `/admin/login` (PKCE, links only for existing users, neutral confirmation); `RequireAdmin` guard with a no-access page for non-admins; admin shell with logout.
  - Categories list per the artboard (count red below 60, status badge, «сьогодні»/short date, search) and an editor (name, hint, save, publish/unpublish with listed reasons, delete with in-page confirmation, stats line).
  - Migration `publish_rule`: a trigger refuses the transition to `published` with < 60 photos or any empty answer for API roles; the service role (seed) is exempt. Pushed to the cloud; advisors clean.
  - Admin is lazy-loaded (separate chunk). 167 unit tests, 26 DB tests.
- **API (`src/features/admin`):** `AdminApi` interface + `createSupabaseAdminApi(client)`, `AdminApiContext`/`useAdminApi`, `AdminSessionProvider`/`useAdminSession`, `AdminRoutes({ api })`, `getPublishProblems`, `formatStats`, `formatUpdated`, `MIN_PHOTOS`; `getSupabase()` now uses the PKCE flow.
- **Spec changes in `admin`:** "Admin authentication" gains guard scenarios; added "Magic link login", "Category list search", "Category editor fields", "Publish rule enforced by the database", "Publish reasons", "Delete category".
- **Deviations from the artboards:** no «Налаштування» item; «Зберегти» instead of «Зберегти чернетку»; cover column is a placeholder until phase 7; the photo grid is phase 7.

**Original plan:**

- Magic-link login, `RequireAdmin` guard, logout
- Categories list (photo count red below 60, status, date), create/edit, publish/unpublish with validation
- Done when publishing is blocked by validation with a visible reason
- Prompt: `/openspec-propose "admin auth and categories: magic link, guard, list, create/edit, publish validation"`

### 7. `add-admin-photo-management` — ✔ archived as `2026-11-18-add-admin-photo-management`

- **Summary.**
  - Bulk upload by drag & drop or file picker. The browser resizes each image to ≤ 1600 px and encodes it as WebP (JPEG as a fallback), applying EXIF orientation. The answer comes from the file name, and `.answer` files pair within the batch or with an existing photo by answer. Uploads run 3 at a time, with progress and a per-file error list.
  - Photo grid per the artboard. The answer is edited inline and saved on blur or Enter; an empty answer gets a red border. Answer photos can be added, replaced or removed. Deleting a photo asks in the card, then removes its files and its row. Vertical photos get a badge, and stats and publish reasons update live.
  - The categories list shows the first photo as the cover. No schema change.
  - **Production:** https://duel-sand.vercel.app (Vercel Production env vars; the cloud Auth Site URL and redirect URLs were pushed alone through a minimal config).
  - 191 unit tests, 27 DB tests; checked in the browser with real JPEGs.
- **API (`src/features/admin`):**
  - `AdminApi` gains `listPhotos`, `addPhoto`, `attachAnswerPhoto`, `removeAnswerPhoto`, `updateAnswer`, `deletePhoto`, and `AdminCategory.coverUrl`;
  - `upload/fileNames` (`parseFileName`, `answerFromName`, `planUpload`), `upload/image` (`compressImage`, `targetSize`), `upload/queue` (`runQueue`);
  - `ImageCompressorContext`.
- **Spec changes in `admin`:** "Bulk photo upload" and "Photo editing" gain scenarios (answer formatting, attaching to existing photos, unmatched files, compression, progress, edit, empty marking, delete confirmation, replace); added "Category cover" and "Production access".
- **Deviations from the artboards:** the drop zone sits full width above the grid instead of next to the name fields; the answer-photo slot gets «замінити» and «прибрати» icon buttons.
- **Owner follow-up:** grant the content editor (and yourself) on the cloud with `npm run db:grant-admin -- --remote <email>`; the cloud has no users yet.

**Original plan:**

- Drag & drop bulk upload with progress, client-side compression (~1600 px WebP), `is_vertical`
- File name → answer; `<name>.answer.<ext>` → answer photo
- Card grid: inline answer edit, add/replace/remove answer photo, "вертикальне" badge, delete with storage files
- Unit tests for file-name parsing and pairing
- Production deploy on Vercel (moved from phase 9), so a content editor can fill categories from their own device; grant them with `db:grant-admin`
- Done when a 60+ photo category can be filled in minutes and published, and the editor can do it on the production URL
- Prompt: `/openspec-propose "admin photo management: bulk upload, compression, filename answers, answer photos, edit and delete, production deploy"`

### 8. `connect-game-to-supabase` — ✔ archived as `2026-11-18-connect-game-to-supabase`

- **Summary.**
  - `createSupabaseCategorySource`:
    - lists published categories (an explicit filter, so an admin session in the same browser does not leak drafts), with photo counts, sorted by name;
    - loads a category with 6 h signed URLs;
    - supabase-js is a lazy chunk.
  - `createCategorySource(env)`: Supabase by default; the mock with `VITE_CATEGORY_SOURCE=mock` or when Supabase env is missing (unit tests blank it).
  - Start: load → seeded order → decode the first 3 photos and their answer photos (max 8 s) → countdown. During the game the current photo and the next 3 (with answer photos) are decoded through `createImagePreloader` (LRU of 12).
  - «Фото не завантажилось» replaces a broken image.
  - Production redeployed and plays the cloud catalog. 209 unit tests, 30 DB tests.
- **API (`src/features/play`):** `createSupabaseCategorySource(getClient?)`, `createCategorySource(env)` / `categorySourceKind`, `createImagePreloader({ createImage, capacity })`, `upcomingSources(photoIds, index, byId, ahead)`, and the `GameFlow` `preloader` prop.
- **Spec changes in `game-ui`:** "Preloading" gains a "What is preloaded" scenario; added "Category source", "Loading before start", "Photo load failure".
- **Note:** the cloud still holds the 3 seeded mock categories (published in phase 5); delete them in the admin once real categories exist.

**Original plan:**

- Setup lists published categories from Supabase; photos loaded before start
- Preload next 2–3 photos plus answer photos (`img.decode()`)
- Loading / error states; mock mode kept behind an env flag
- Done when a duel on a published category has no delay between photos
- Prompt: `/openspec-propose "connect game to supabase: published categories, photo loading, preloading with answer photos"`

### 9. `polish-host-experience`

- Sounds (correct, wrong, last-10-s ticking, game over) with mute
- Fullscreen, hotkeys cheat sheet and host instructions on the setup screen
- Test game over Zoom / Meet on the production deploy (deployed since phase 7)
- Done when a real test game over a video call has been played
- Prompt: `/openspec-propose "polish host experience: sounds, fullscreen, hotkeys cheat sheet, host instructions"`
