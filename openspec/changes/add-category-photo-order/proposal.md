# Proposal: add-category-photo-order

## Why

Some categories are more fun when they get harder as the game goes on. «Марки авто» is one: well-known brands should come first and obscure ones last. Today the game always shuffles the photos, so the order the admin sets has no effect on play. The admin also has no way to change the order without a database script.

## What Changes

**Game rule change (`game-engine` → "Photo order"):** a game can use a fixed photo order instead of the shuffle. Both players still draw from one sequence, and photos still never repeat. With a fixed order:
- the photos are shown in the category's order;
- a rematch shows them in the same order;
- the seed still decides a random first player.

**Category setting:**
- a new per-category setting «Порядок фото» with two values: «Випадковий» (default; today's behaviour) and «Від легких до складних» (the order set in the admin);
- it is stored as a new `categories.photo_order` column (forward migration, default `random`);
- existing categories keep shuffling.

**Admin:**
- the setting is in the category editor next to the name and hint, and saves with them;
- photos can be reordered in the editor's photo grid:
  - by drag and drop;
  - with the keyboard through «Перемістити раніше» / «Перемістити пізніше» buttons on each card;
  - each move is saved immediately;
  - a failed save restores the previous order and shows an error;
- the new order is saved in one transaction through a database function that only admins can call;
- photo cards show their number (1, 2, 3…), so the order is visible.

**Game:**
- the category source passes the setting to the game;
- the mock catalog stays random.

**Data follow-up:** after deploy, switch «Марки авто» (already sorted from well-known to obscure) to «Від легких до складних».

## Out of scope

- A per-game switch on the setup screen; the order belongs to the category.
- Showing the order mode on the setup screen's category cards.
- Partial shuffles (for example, shuffling within difficulty tiers) and difficulty labels per photo.
- Changing the publish rule or the cover rule. The cover stays the first photo, so reordering can change a category's cover.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `game-engine`: "Photo order" allows a fixed order besides the seeded shuffle. **This is a game-rule change.**
- `game-ui`: "Category source" — a duel uses the category's photo order setting.
- `admin`:
  - added "Photo order setting" (the «Порядок фото» field);
  - added "Photo reordering" (drag and drop, keyboard moves, atomic save, numbered cards).

## Impact

- **Engine (`src/game`):**
  - `CreateGameOptions` gains `photoOrder: 'random' | 'fixed'` (default `random`);
  - `createGame` skips the shuffle for `fixed` but still draws the random starter from the seed.
- **Play (`src/features/play`):**
  - `PlayCategory.photoOrder`;
  - `supabaseCategorySource` selects `photo_order`, and `mockCategorySource` sets `random`;
  - `GameFlow` passes the order to `createGame` and to the preload order.
- **Admin (`src/features/admin`):**
  - `adminApi`: category `photoOrder`, a new `reorderPhotos(categoryId, ids)`;
  - `fakeAdminApi`, `CategoryEditorPage`, `PhotoCard`, `admin.css`.
- **Database:**
  - one migration: enum `photo_order` plus a column on `categories`, and function `public.reorder_photos(category_id uuid, photo_ids uuid[])` (security invoker, so RLS applies);
  - then `db:types`, `tests/db/*`, and `npx supabase db push --remote`.
- **Overlap:** `polish-admin-and-storage` (proposed) also edits `CategoryEditorPage` and `PhotoCard`. The specs don't conflict, because this change only adds admin requirements. Whichever change lands second rebases its code.
- **Docs:** CLAUDE.md data model, `docs/roadmap.md` phase 12.
