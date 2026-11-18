## 1. Engine

- [ ] 1.1 `src/game/types.ts` / `reducer.ts`: add `photoOrder?: 'random' | 'fixed'` to `CreateGameOptions` (default `random`). With `fixed`, keep `photoIds` as given but still create the RNG from the seed and draw the starter from it, as today.
- [ ] 1.2 Vitest in `src/game/game.test.ts`:
  - fixed order keeps A, B, C, D;
  - two seeds give the same fixed order;
  - fixed order + `first: 'random'` yields both starters over a range of seeds;
  - `random` with a given seed gives exactly the same game as before the change (snapshot of an existing seed).

## 2. Database

- [ ] 2.1 Run `npx supabase migration new category_photo_order`. In it:
  - add enum `public.photo_order ('random','fixed')`;
  - add column `categories.photo_order not null default 'random'`;
  - add function `public.reorder_photos(p_category_id uuid, p_photo_ids uuid[])` (plpgsql, security invoker, `search_path = ''`):
    - validates no duplicates and that the array equals the category's photo set;
    - runs one `update … unnest … with ordinality`;
    - raises an error if fewer rows were updated than ids were given;
  - grants: revoke execute from `public`/`anon`, grant to `authenticated`.
- [ ] 2.2 Run `npm run db:reset` and `npm run db:types`. Add DB tests in `tests/db/photos.test.ts`:
  - an admin reorders 5 photos and the positions follow the array;
  - a non-admin and anon are rejected and the positions are unchanged;
  - a missing id, a duplicate, or another category's id is rejected;
  - `photo_order` defaults to `random`, and anon can read it for published categories.

## 3. Game wiring

- [ ] 3.1 `PlayCategory.photoOrder`:
  - `supabaseCategorySource` selects `photo_order` and maps it;
  - `mockCategorySource` returns `random`;
  - update the source tests, including `tests/db/gameSource.test.ts` if it checks the shape.
- [ ] 3.2 `GameFlow`: pass `category.photoOrder` to the preload `createGame` and to `useGame`/`createGame`; the rematch keeps a new seed. Tests:
  - a fixed-order category shows photos in position order;
  - the rematch shows the same order;
  - the preload requests the first 3 photos in position order.

## 4. Admin: setting

- [ ] 4.1 `adminApi` / `fakeAdminApi`:
  - `AdminCategory.photoOrder`, read in `getCategory`;
  - `createCategory` / `updateCategory` accept `photoOrder`.
- [ ] 4.2 `CategoryEditorPage`:
  - a «Порядок фото» `fieldset` with the radios «Випадковий» / «Від легких до складних», saved with name and hint;
  - default «Випадковий» for a new category.

  Tests: the default is saved for a new category, a switch is saved and shown after reopening.

## 5. Admin: reordering

- [ ] 5.1 `adminApi.reorderPhotos(categoryId, ids)` calls `rpc('reorder_photos')`; the fake reorders in memory and can be told to fail.
- [ ] 5.2 `PhotoCard`:
  - a visible number (`index + 1`);
  - «Перемістити раніше» / «Перемістити пізніше» buttons with `aria-label`s, disabled at the ends;
  - `draggable` with `dragstart`/`dragover`/`drop` handlers from the editor;
  - an insertion marker (a coloured border, not only opacity) in `admin.css`.
- [ ] 5.3 `CategoryEditorPage`:
  - a `movePhoto(from, to)` that updates state optimistically and calls `reorderPhotos`;
  - on error, restore the previous order and show «Не вдалося змінити порядок» — only for the latest request (a counter);
  - announce «Фото N переміщено на позицію M» in a polite live region;
  - keep focus on the moved card's button after a keyboard move.
- [ ] 5.4 Tests in `PhotoEditing.test.tsx`:
  - a keyboard move updates the numbers and the fake API order;
  - focus stays on the moved card's button;
  - the end buttons are disabled;
  - a drag (`fireEvent.dragStart`/`dragOver`/`drop`) moves photo 5 to 1;
  - a failed save restores the order and shows the error.

## 6. Verify, deploy, record

- [ ] 6.1 Run `npm test`, `npm run test:db`, `npm run build`, `npm run lint` and `npx @fission-ai/openspec validate --all --strict`.
- [ ] 6.2 Browser check on the local stack:
  - set «Від легких до складних», reorder by drag and by keyboard, reload;
  - play the category: photos come in order, and the rematch shows the same order;
  - a random category still shuffles.
- [ ] 6.3 Cloud:
  - `npx supabase db push --remote`, then check advisors;
  - `npx vercel deploy --prod`;
  - set «Марки авто» to `fixed`;
  - check on production that the first photos are Toyota, Mercedes-Benz, BMW.
- [ ] 6.4 Docs:
  - CLAUDE.md data model (`photo_order`, `reorder_photos`);
  - roadmap phase 12 `add-category-photo-order` (▶ while in progress; ✔ with a summary after archiving).
