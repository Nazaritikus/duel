## 1. Database migration

- [x] 1.1 Create a migration with `npx supabase migration new admin_storage_hardening`. In it:
  - add the path CHECK on `photos` (`not valid` + `validate`);
  - replace `photos_touch_category` with statement-level triggers that use transition tables;
  - drop `categories_status_idx`;
  - restrict the admin storage `insert`/`update` policies to raster extensions and a non-SVG `metadata->>'mimetype'`.
- [x] 1.2 Run `npm run db:reset` and `npm run db:types`. Add DB tests in `tests/db/`:
  - the path CHECK rejects a path outside the category;
  - an admin SVG upload is rejected, both as `x.svg` and as `x.webp` sent with `image/svg+xml`;
  - an admin WebP upload still works;
  - a 60-row insert moves `updated_at` and updates `categories` once;
  - existing `touch` tests still pass.
- [x] 1.3 (Not needed: the check works — an admin upload of SVG content as `x.webp` is rejected.) If the `metadata` mimetype check proves ineffective (see design decision 7):
  - switch to the fallback: the seed rasterises the SVGs to PNG and SVG is removed from the bucket allowlist;
  - record the outcome in design.md.

## 2. Scripts

- [x] 2.1 `scripts/supabase-env.mjs`:
  - load `.env.local` before `.env`;
  - `localEnv` rethrows with `{ cause }` and includes the underlying message.

  Check manually with two temp env files that `.env.local` wins.
- [x] 2.2 `scripts/seed-supabase.mjs`:
  - fail on duplicate names;
  - upload new files in parallel batches of 8;
  - insert the new rows after the current max position, then delete the old rows and files;
  - best-effort cleanup of the new files on failure.

  Run it twice against the local stack and confirm that each category always has photos (a query between the steps, or a log of the counts).
- [x] 2.3 Add `scripts/storage-orphans.mjs` and the npm script `db:storage-orphans`, with `--remote` and `--apply` (dry run by default). Test it locally: delete a category row directly with SQL, check that the dry run lists its files, run `--apply`, then confirm the folder is gone and the other files are intact.

## 3. Shared admin components

- [x] 3.1 Add `ConfirmDialog`:
  - native `<dialog>` with `showModal()` on mount;
  - `<form method="dialog">` actions with `autoFocus` on the cancel button;
  - `Esc` cancels;
  - `::backdrop` and `overscroll-behavior: contain` in `admin.css`.

  Add a `showModal`/`close` polyfill for jsdom in `src/test/setup.ts`, plus unit tests for confirm, cancel and Esc.
- [x] 3.2 Add `useLeaveGuard(active, message)`, built on `useBlocker` with `ConfirmDialog` («Залишити сторінку» / «Залишитися») and `beforeunload` while `active`. Unit test it with `createMemoryRouter`:
  - a blocked navigation shows the dialog;
  - «Залишитися» keeps the route;
  - «Залишити сторінку» proceeds.

## 4. Category editor and photos

- [x] 4.1 `CategoryEditorPage`:
  - the dirty flag compares against the last saved name and hint;
  - lift `running` from `PhotoUploader` (`onRunningChange`);
  - add `useLeaveGuard(dirty || uploading, …)`, with the upload message taking priority;
  - no guard on the post-save redirect for a new category.
- [x] 4.2 `CategoryEditorPage`: a refused save focuses `#category-name`; add `required`, `aria-invalid` and `:user-invalid` styling.
- [x] 4.3 `CategoryEditorPage` delete → `ConfirmDialog` («Видалити» / «Скасувати»). The trigger stays mounted, and focus returns to it on cancel.
- [x] 4.4 `PhotoCard`:
  - delete → `ConfirmDialog`, focus returns to the trash button;
  - removing the answer photo (the «×» on the answer image) also asks in a `ConfirmDialog` («Прибрати» / «Скасувати»);
  - the delete button gets a visible «Видалити» label so it is not mistaken for the «×»;
  - Enter guarded with `isComposing`;
  - the first 6 thumbnails eager.
- [x] 4.5 `PhotoUploader`:
  - `<progress>` with a visible label;
  - the `role="status"` text appears only when the batch ends.
- [x] 4.6 Tests (update `PhotoEditing.test.tsx` and the editor tests):
  - unsaved hint edit + «← Категорії» → dialog;
  - after saving → no dialog;
  - upload running + navigation → dialog;
  - empty name → focus on the field;
  - delete cancel → focus back on the trigger;
  - «Прибрати фото відповіді» asks first, and cancelling keeps the answer photo;
  - the IME Enter does not save.

## 5. Categories list, login, shell

- [x] 5.1 `CategoriesPage`:
  - native `<table>` with a hidden caption;
  - the empty state outside the table;
  - CSS keeps the current grid look and responsive columns;
  - the first 8 covers eager.
- [x] 5.2 Search:
  - `<search>` + `type="search"`, `autoComplete="off"`, `spellCheck={false}`;
  - the query in `?q=` through `useSearchParams` with `replace`.

  Test that loading `/admin?q=авто` pre-fills and filters.
- [x] 5.3 `LoginPage` email: `spellCheck={false}`, `autoCorrect="off"`, `autoCapitalize="none"`. `AdminShell`: the nav links and «Вийти» join the shared `:focus-visible` rule.

## 6. Verify, deploy, record

- [x] 6.1 Run `npm test`, `npm run test:db`, `npm run build`, `npm run lint` and `npx @fission-ai/openspec validate --all --strict`.
- [x] 6.2 Browser check on the local stack (Mailpit login):
  - unsaved-edit guard (in-app and on reload);
  - upload-leave guard;
  - both delete dialogs (Tab, Esc, focus return);
  - table and search with a reload;
  - progress bar;
  - SVG drop rejected (if the admin UI lets one through compression at all — expected: compression turns any image into WebP, so check it at the API level in the DB test).
- [x] 6.3 Cloud:
  - `npx supabase db push --remote`, then check advisors;
  - run `npm run db:storage-orphans -- --remote` as a dry run only and report the result; do not `--apply` on the cloud without the owner.
- [x] 6.4 Docs and roadmap:
  - `docs/setup.md` (env precedence, the orphans script) and the CLAUDE.md commands;
  - roadmap: phase 11 `polish-admin-and-storage` (▶ while in progress, ✔ with a summary after archiving).
