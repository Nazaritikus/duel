# Proposal: lower-publish-minimum

## Why

The first real category («Марки авто») ended up with 57 good photos after weak ones were removed. Sixty is more than a game needs, so the owner lowered the publish minimum to 50.

## What Changes

- **Publish minimum:** a category can be published with at least **50** photos (was 60), still with no empty answers. This applies:
  - in the database trigger `enforce_publish_rule` (forward migration, `create or replace function`);
  - in the admin UI (`MIN_PHOTOS`): the red count in the list, the publish reasons, and the hint text.
- Already published categories are not affected. As before, only the transition to `published` is checked.

## Out of scope

- Making the minimum configurable per category or in settings.
- Game rules: the engine works with any number of photos.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `admin`: "Category management" (red count and publish block below 50) and "Publish rule enforced by the database" (50 instead of 60).

## Impact

- **Database:** a new migration that redefines `public.enforce_publish_rule()`; `tests/db/publish.test.ts` moves from 59/60 to 49/50. It must be pushed with `npx supabase db push --remote`.
- **Admin code:** `src/features/admin/publishRules.ts` and its tests, `AdminRoutes.test.tsx`.
- **Docs:** CLAUDE.md data model, `docs/roadmap.md`.
