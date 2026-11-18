# Design: add-category-photo-order

## Context

- **Engine.** `createGame({ photoIds, now, seed, settings })` in `src/game/reducer.ts`:
  - shuffles `photoIds` with `createRng(seed)`;
  - then draws the random starter from the same RNG;
  - `GameFlow` calls it twice: once to compute the preload order and once in `useGame`, both with the same seed.
- **Positions.**
  - `photos.position` already exists and is unique per category, `deferrable initially deferred`.
  - `supabaseCategorySource.loadCategory` and the admin `listPhotos` already return photos sorted by position.
  - The cover is the lowest position.
- **Admin access.**
  - Admin writes go through RLS: `private.is_admin()` policies on `categories` and `photos`.
  - `authenticated` has `insert, update, delete` grants.
- **Existing data.** «Марки авто» on the cloud is already sorted from well-known to obscure (positions 0–59).
- **Overlap.** `polish-admin-and-storage` (proposed, not applied) also edits `CategoryEditorPage`, `PhotoCard` and the `touch_category` trigger.

## Goals / Non-Goals

**Goals:**
- A category can be played in its admin order, and the same order is used on every rematch.
- Admins can reorder photos with the mouse and with the keyboard, and a reorder is atomic.
- Existing categories and the mock catalog behave exactly as today.

**Non-Goals:**
- A per-game order switch, difficulty tiers, or per-photo difficulty.
- Reordering on touch devices beyond what native drag and drop gives. The keyboard buttons cover everything else.

## Decisions

1. **Engine option `photoOrder: 'random' | 'fixed'`, default `random`.**
   - With `fixed`, `createGame` keeps `photoIds` as given.
   - It still creates the RNG from the seed and draws the starter, so `first: 'random'` stays random and seeded.
   - With `random` the code path is unchanged, so every existing seed gives the same game as before.
   - *Alternative rejected:* the caller passes already-ordered ids and the engine gets a "don't shuffle" flag named after the UI. That leaks UI wording into the engine; `fixed` describes the rule.
2. **Storage: Postgres enum `photo_order` (`random`, `fixed`), column `categories.photo_order not null default 'random'`.**
   - This mirrors `category_status`.
   - The default backfills existing rows, so no data migration is needed.
   - The UI labels («Випадковий», «Від легких до складних») live only in the client.
3. **Atomic reorder through `public.reorder_photos(p_category_id uuid, p_photo_ids uuid[])`.**
   - It is `language plpgsql`, `security invoker` and `set search_path = ''`, so RLS still decides who may update.
   - It raises an error unless both hold:
     - the array has no duplicates;
     - it equals exactly the set of the category's photo ids.
   - Then one `update … from unnest(p_photo_ids) with ordinality` sets `position = ordinality - 1`. The deferred unique constraint is checked at commit, so swaps never collide.
   - If the update touches fewer rows than the array length, the function raises an error. Under RLS a non-admin updates 0 rows, so the call fails loudly instead of silently doing nothing.
   - Grants: `execute` is revoked from `public` and `anon` and granted to `authenticated`.
   - *Alternative rejected:* one `update` per photo from the client. That is not atomic, needs 60 requests and could hit the unique constraint.
   - *Alternative rejected:* `upsert` of whole rows. It goes through insert RLS and every column, which is fragile.
4. **Admin UI.**
   - **Setting:** a `fieldset` «Порядок фото» with two radio options in the category form, saved with name and hint through `updateCategory` / `createCategory`, which gain `photoOrder`.
   - **Card number:** each `PhotoCard` shows its number (`index + 1`).
   - **Drag and drop (native HTML):**
     - the card is `draggable`;
     - `dragover` on a card shows an insertion marker (a coloured left border; not only opacity);
     - `drop` moves the dragged card to that index.
   - **Keyboard:** two small buttons on each card, «Перемістити раніше» (←) and «Перемістити пізніше» (→), with full `aria-label`s. They are disabled at the ends. After a move, focus is put back on the same button of the moved card.
   - **Save:**
     - every move updates local state at once and calls `reorderPhotos(categoryId, ids)`;
     - on error the previous array is restored and the editor's existing error line shows «Не вдалося змінити порядок»;
     - a polite live region announces «Фото N переміщено на позицію M».
   - *Alternative rejected:* a DnD library (dnd-kit). Native DnD plus buttons is enough for a single grid, and the project keeps dependencies minimal.
5. **Game wiring.**
   - `PlayCategory.photoOrder` comes from `photo_order` in `supabaseCategorySource`; the mock source always uses `random`.
   - `GameFlow` passes it to both `createGame` calls (preload and `useGame`), so the preloaded photos match the shown order.
   - The rematch keeps creating a new seed. With `fixed` that only changes the starter.
6. **Uploads append at the end** (current behaviour: after the max position). A new photo in a fixed-order category is therefore the "hardest" until it is moved. This is documented, not changed.

## Risks / Trade-offs

- **The cover changes when photo 1 changes.** That is the documented cover rule; the scenario makes it explicit.
- **Native drag and drop does not work on touch screens.** Admins use desktops, and the keyboard buttons also work by tap.
- **Rapid successive moves can race:**
  - each call sends the full order, so the last request wins;
  - but a slow earlier failure could roll back to a stale order;
  - the editor ignores a failure from a request that is not the latest (a request counter).
- **Overlap with `polish-admin-and-storage`.** Both changes touch the editor and the cards. There is no spec conflict, because this change only ADDs admin requirements. Whichever is applied second rebases its code. If polish lands first, `reorder_photos` still works with a statement-level `touch_category`.
- **Fixed order is predictable across rematches.** That is the point; the host chooses it per category.

## Migration Plan

1. Run `npx supabase migration new category_photo_order`: the enum, the column and the function with its grants.
2. Locally: `db:reset`, `db:types`, then `test:db` with new tests.
3. Deploy:
   - `npx supabase db push --remote`, then the advisors;
   - deploy the app with `npx vercel deploy --prod`.
   - The column has a default, so the old client keeps working during the gap.
4. Data: set «Марки авто» to `fixed` in the admin, or with one update through the secret key.
5. Rollback: the app ignores the column if reverted. A forward migration can drop the function, column and enum if ever needed.
