# Design

## Context

- `GameFlow({ source, clock, storage, newSeed })` lists categories on mount and calls `source.loadCategory(id)` on start. `PlayCategory` / `PlayPhoto` carry `src` / `answerSrc` URLs, and `routes.tsx` passes `createMockCategorySource()`.
- `createGame({ photoIds, now, seed })` shuffles deterministically per seed, so `state.photoIds` is the display order and `state.photoIndex` is the current position.
- `getSupabase()` is a lazy singleton with a persisted session, and the admin uses the same client and storage. An admin signed in on the same browser therefore reads drafts through RLS.
- Storage is private, so players need signed URLs. RLS already lets `anon` sign the files of published categories.
- The "Preloading" requirement already exists in `game-ui`, but nothing implements it: the mock images are local and tiny.

## Goals / Non-Goals

**Goals:** published categories in the game, no visible delay between photos, the mock kept for tests and offline work.

**Non-Goals:** long-session URL refresh, service worker, hint display.

## Decisions

### 1. `createSupabaseCategorySource(getClient)`
- `getClient: () => Promise<TypedSupabaseClient>`. It defaults to `() => import('../../lib/supabase').then(m => m.getSupabase())`, so supabase-js is a separate chunk loaded after first paint.
- **`listCategories`:**
  - `select('id, name, photos(count)').eq('status', 'published')`;
  - categories with 0 photos are skipped;
  - sorted with `localeCompare(…, 'uk')`.
- **`loadCategory(id)`:**
  - `select('id, name, photos(id, storage_path, answer_storage_path, answer, is_vertical, position)').eq('id', id).eq('status', 'published').single()`;
  - it signs every path in one `createSignedUrls` call with a TTL of 6 h, and photos whose question URL failed to sign are dropped;
  - it throws when nothing is left.
- **The published-only filter is explicit:** RLS alone would show drafts to a signed-in admin.

*Alternative:* a separate client without a session for the game. Rejected: a second GoTrue client on the same storage key triggers warnings, and the explicit filter is enough.

### 2. Source selection (`categorySource.ts`)
`createCategorySource(env)` returns the mock when `VITE_CATEGORY_SOURCE === 'mock'` or when either Supabase var is missing; otherwise it returns Supabase. `routes.tsx` calls it once. The `.env.example` documents the flag.

### 3. Preloading
- `imagePreloader.ts` exposes `createImagePreloader({ createImage, capacity = 12 })` → `preload(src): Promise<void>`. It works like this:
  - it creates an `Image`, sets `decoding = 'async'` and `src`, then awaits `decode()` (and falls back to the `load` event if `decode` is missing);
  - it caches the image and its promise per src in insertion order, evicting the oldest entries beyond the capacity;
  - a failed preload is removed from the cache, so a retry can happen;
  - keeping the `Image` object alive keeps the decoded bitmap warm.
- `preloadPlan.ts` exposes `upcomingSources(photoIds, photoIndex, photosById, ahead = 3)` → `[current.src, current.answerSrc, next1.src, next1.answerSrc, …]` without nulls. It is pure and unit-tested; already cached sources resolve immediately.
- `usePreloadPhotos(state, photosById, preloader)` in `ActiveGame` runs an effect on `state.photoIndex` and calls `preload` for each source. Errors are ignored there, because `PhotoFrame` handles failures.

### 4. Start sequence
In `GameFlow.start`:
1. `loadCategory`;
2. `seed = newSeed()`;
3. `order = createGame({ photoIds, now: 0, seed }).photoIds`;
4. preload `upcomingSources(order, 0, …, 2)`, which covers the first three photos and their answers, raced against an 8 s timeout;
5. `setFlow({ …, seed })`.

The same seed is passed to `ActiveGame`, so the game shows exactly the preloaded order. Preload failures do not block the start. A rematch uses a new seed; its first photos are preloaded during its 3 s countdown by `usePreloadPhotos` (index 0).

### 5. Failure display
`PhotoFrame` tracks `failedSrc` with `onError` and shows the text «Фото не завантажилось» (centred, muted) instead of the `<img>` when `failedSrc === src`. The state resets naturally when `src` changes.

### Decisions made autonomously
1. **Explicit `status = 'published'` filter** in the game queries, for the shared admin session (§1).
2. **Published categories are listed regardless of their current photo count.** The DB enforces ≥ 60 at publish time, and the admin shows a warning if a published category later drops below. Hiding them in the game would make such a category silently disappear.
3. **Signed URL TTL of 6 h**; no refresh during a session.
4. **The mock is the automatic fallback** when Supabase env vars are missing, besides the explicit flag.
5. **Preload depth of 3** ahead plus the current answer photo, a cache of 12 decoded images, and an 8 s start timeout.
6. **The cloud still contains the 3 seeded mock categories** (published by the seed in phase 5). They stay as test content; deleting them is an owner decision (follow-up).

## Risks / Trade-offs

- **Slow networks:** 8 s may not be enough for the first three 1600 px WebPs (~200–400 KB each). → The game starts anyway, and the countdown gives 3 more seconds.
- **Memory:** 12 decoded 1600×1200 images take about 90 MB. → Acceptable on a host laptop; the capacity is a parameter.
- **Admin session in the same browser:** handled by the explicit filter.

## Migration Plan

No schema change. After merge, `npx vercel deploy --prod`. The Production env already has the Supabase vars, so production switches from mock to Supabase.
