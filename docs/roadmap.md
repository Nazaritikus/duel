# Roadmap

One phase = one OpenSpec change (`/openspec-propose` → `/openspec-apply-change` → `/openspec-archive-change`).
Requirements live in `openspec/specs/`; this file only tracks order and status.

**Status legend:** ✔ done · ▶ in progress · ○ next / not started

| # | Phase (OpenSpec change) | Status | Result |
|---|---|---|---|
| 1 | `add-game-engine-core` | ✔ 2026-11-17 | Pure engine: chess clocks, turns, correct/wrong/pass feedback, time-out |
| 2 | `complete-game-engine-rules` | ○ | Countdown, pause, shuffle, photos exhausted & draw, stats, time formatting |
| 3 | `add-play-screen` | ○ | Playable game screen with hotkeys on mock data |
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

### 2. `complete-game-engine-rules`
- `countdown` phase (3-2-1; first player = player 1 or random)
- `pause` / `resume` from any active state; feedback timer suspended too
- Seedable shuffle without repeats
- Photos exhausted → more remaining time wins; equal to 0.1 s → draw
- Stats per player: correct, wrong, pass
- Time formatting helper (`m:ss`, tenths in the last 10 s)
- Done when every scenario in `openspec/specs/game-engine/spec.md` has a test
- Prompt: `/openspec-propose "complete game engine rules: countdown, pause, shuffle, photos exhausted and draw, stats, time formatting"`

### 3. `add-play-screen`
- App shell: routing (`/`, `/play`, `/admin/*` stub), fonts, design tokens
- 16:9 `Stage` scaled to the window
- Game screen: photo (`object-fit: contain`), status bar, active / "Заморожено", last-10-s state
- Feedback states (green 2 s, red 3 s "Помилка" / "Пас"), answer photo when present
- `useGameLoop` (rAF → `tick`), `useHostHotkeys` (ignored while focus is in an input)
- Mock category in `public/mock/`
- Done when `/play` can be played to the end with the keyboard and matches the design
- Prompt: `/openspec-propose "play screen: stage 16:9, photo, status bar, feedback states, host hotkeys, mock category"`

### 4. `add-game-flow-screens` — offline MVP
- Setup (names, category with search, 45/60/90 s, who starts), countdown, pause overlay, `Esc` exit with confirmation
- Result: winner / draw, reason, stats, "Реванш", "Інша категорія"
- Component tests for Setup → Game → Result
- Done when a full duel with rematch can be played on mock data
- Prompt: `/openspec-propose "game flow: setup, countdown, pause overlay, result and rematch"`

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
