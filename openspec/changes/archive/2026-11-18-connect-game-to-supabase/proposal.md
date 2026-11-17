# Proposal

## Why

The game still plays the generated mock catalog, while real categories now live in Supabase and are filled through the admin panel on production. Players need to play the published categories, and photos have to appear instantly when the turn passes, even though they now come from a private bucket over the network.

## What Changes

**Category source:**
- a Supabase-backed `CategorySource`:
  - it lists published categories with their photo counts, sorted by name;
  - it loads one category with signed URLs for every photo and answer photo;
- the setup screen and the game keep using the `CategorySource` seam unchanged;
- drafts are excluded explicitly, so an admin signed in on the same browser still sees only published categories in the game;
- the mock catalog stays behind `VITE_CATEGORY_SOURCE=mock`. It is also the automatic fallback when Supabase env vars are missing, for example in tests and offline development;
- supabase-js is loaded lazily, so the setup screen paints without it.

**Loading before start:** «Почати дуель» loads the category, works out the shuffled order for the seed, and decodes the first three photos and their answer photos before the countdown. It waits at most 8 s, then starts anyway. The button shows «Завантаження…» meanwhile, and an error message appears if the category cannot be loaded.

**Preloading during the game:** whenever the photo changes, the current answer photo and the next three photos with their answer photos are decoded in the background (`img.decode()`). Decoded images are kept in a small cache (the last 12).

**Photo failure:** if a photo still fails to load, the frame shows «Фото не завантажилось» instead of a broken image, and the host can pass.

**Game rules:** no change.

**Out of scope:**
- Re-signing URLs during very long sessions: they are valid for 6 h, and choosing another category signs them again.
- Showing the category hint on the game screen (it is not in the design).
- Offline / service-worker caching.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- **`game-ui`:**
  - "Preloading" specifies the current answer photo plus the next three photos and their answer photos;
  - added "Category source" (published categories from the database, drafts excluded even for a signed-in admin, mock behind a flag);
  - added "Loading before start";
  - added "Photo load failure".

## Impact

- **New:**
  - `src/features/play/supabaseCategorySource.ts`;
  - `categorySource.ts`, which picks the source from env;
  - `imagePreloader.ts`, `preloadPlan.ts` and `usePreloadPhotos`;
  - tests for each.
- **Changed:**
  - `GameFlow.tsx` (preload before start and during the game, `preloader` prop);
  - `PhotoFrame.tsx` (failure state);
  - `routes.tsx` (source from env);
  - `.env.example`, `docs/setup.md`, `CLAUDE.md` (the flag).
- **Deploy:** production redeploy at the end. No schema change.
