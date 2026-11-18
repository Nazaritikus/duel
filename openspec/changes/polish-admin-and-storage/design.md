# Design: polish-admin-and-storage

## Context

These findings come from the review on 2026-11-18. Each one below describes the current state.

- **Admin router:**
  - The app uses a data router (`createBrowserRouter` in `routes.tsx`).
  - The admin mounts nested `<Routes>` under `/admin/*`.
  - Admin tests use `createMemoryRouter`, which is also a data router.
  - So `useBlocker` is available everywhere the admin renders.
- **Delete confirmations:**
  - Inline `role="alertdialog"` blocks in `CategoryEditorPage` (about line 310) and `PhotoCard` (line 204) replace the trigger button.
  - When the trigger disappears, focus falls to `<body>`.
  - The photo confirm reads «Так» / «Ні».
- **Uploader:**
  - `PhotoUploader` renders a `div` bar inside `role="status"`.
  - The status text changes after every file, so it is re-announced each time.
- **Categories list:** `CategoriesPage` builds a table out of `div`s with ARIA table roles, and the empty-state `<p>` sits inside it.
- **Storage bucket:** `photos` allows `image/svg+xml` for everyone (`20261117222644_storage.sql`). The seed uploads the generated mock SVGs with the secret key.
- **Photo paths:** nothing ties `photos.storage_path` to `category_id`. Storage RLS authorises by the first folder of the object name.
- **`touch_category`:** it is `FOR EACH ROW`.
- **`categories_status_idx`:** it indexes a two-value enum on a table with only a few dozen rows.
- **Env loading:** `remoteEnv()` loads `.env` and then `.env.local` with `process.loadEnvFile`, which never overwrites a variable that is already set. So `.env` wins.
- **Seed:**
  - deletes the photo rows and the folder, then uploads sequentially, then inserts;
  - matches categories by `name` and takes `existing[0]`.

## Goals / Non-Goals

**Goals:**
- No silent loss of admin work.
- Keyboard and screen-reader correct confirmations, progress and table.
- Admin uploads limited to raster images.
- Paths enforced to match the documented layout.
- Scripts that cannot target the wrong project or empty a published category.

**Non-Goals:**
- No unique category names.
- No database-driven file deletion.
- No visual redesign of the admin.
- No play-side changes.

## Decisions

### 1. `useLeaveGuard(active, message)`
A hook built on react-router's `useBlocker(active)` plus a `beforeunload` listener while `active` is true.

- **In-app navigation:** when blocked, the hook opens the same `ConfirmDialog` as below, with «Залишити сторінку» / «Залишитися». It never uses `window.confirm`.
- **Reload or tab close:** `beforeunload` shows the browser's own generic prompt. That prompt is the only option there.
- **Editor:** `active` is `dirty || uploading`.
  - `dirty` means the trimmed name or hint differs from the last saved values.
  - `uploading` is lifted from `PhotoUploader` through an `onRunningChange` callback.
- **After saving:** `dirty` becomes false before the post-save navigation for a new category (`/categories/new` → `/categories/:id`), so that navigation is not blocked.
- **Which message:** uploading takes priority. «Завантаження ще триває — решта файлів не завантажиться» is shown instead of the unsaved-edits text.

### 2. `ConfirmDialog` on native `<dialog>`
The admin is not inside a transformed stage, so the guide's first choice applies.

- **Markup:** `<dialog>` opened with `showModal()` on mount. The buttons sit in a `<form method="dialog">`.
- **Focus:**
  - `autoFocus` goes on «Скасувати».
  - On close, focus returns to the trigger. Native `<dialog>` does this automatically when the trigger is still in the DOM.
  - Trigger buttons now stay mounted, so they are no longer swapped out.
- **Closing:** `Esc` fires `cancel` and closes the dialog.
- **Styling:** `overscroll-behavior: contain`, and a `::backdrop` in the admin palette.
- **Usage:**
  - category delete: «Видалити категорію „X“? Фото й файли буде видалено назавжди.»;
  - photo delete;
  - the leave guard.
- **jsdom:** it does not implement `showModal`/`close`. `src/test/setup.ts` gets a small polyfill that toggles `open` and dispatches `close`/`cancel`. The real behaviour is checked in the browser.

### 3. Editor validation focus
On a refused save, call `nameRef.current.focus()` and add `required` and `aria-invalid`. The CSS uses `:user-invalid` for the red border, so the error only appears after interaction, alongside the existing error text.

### 4. Upload progress
`<progress max={total} value={done}>` gets a visible label «Завантажено N з M», with no live region on it. A separate `role="status"` element stays empty while running and receives «Готово: оброблено N з M» once the batch ends. Styling uses `appearance: none` plus `::-webkit-progress-value` / `::-moz-progress-bar` in the existing colours.

### 5. Categories table and search
- **Table:** a native `<table>` with `<caption class="visually-hidden">Категорії</caption>`, `<th scope="col">` and `<td>`. The existing grid look is kept with `display: grid` on `tr` and `display: contents` on `tbody`/`thead`. The responsive column hiding at the 900 px breakpoint is kept.
- **Empty state:** rendered after the table.
- **Search:**
  - `<search><input type="search" autoComplete="off" spellCheck={false}></search>`;
  - the value comes from `useSearchParams().get('q')` and is updated with `setSearchParams({ q }, { replace: true })`, so typing does not flood the history.

### 6. Small admin fixes
- **IME guard:** `if (event.nativeEvent.isComposing) return` in the PhotoCard answer Enter handler.
- **Eager images:**
  - the first 6 photo-card thumbnails use `loading="eager"`, the rest stay `lazy`;
  - the same for the first 8 list covers.
- **Login email:** `spellCheck={false}`, `autoCorrect="off"`, `autoCapitalize="none"`.
- **Focus ring:** the nav links and «Вийти» join the shared admin `:focus-visible` rule.

### 7. Admins cannot upload SVG
We keep `image/svg+xml` in the bucket allowlist so the seed works. The bucket allowlist applies to every role, including the secret key.

- **Policy change:** the admin `insert` and `update` policies on `storage.objects` (role `authenticated`) gain `lower(storage.extension(name)) in ('webp','jpg','jpeg','png','avif')`. The secret key bypasses RLS, so the seed is unaffected.
- **What this blocks:** an SVG uploaded under a raster extension, for example `x.webp` sent as `image/svg+xml`, would still pass the extension check. So the policy also requires `coalesce(metadata->>'mimetype', '') <> 'image/svg+xml'` where storage fills `metadata` before the check.
- **How we confirm it:** a DB test uploads an SVG as an admin under both `x.svg` and `x.webp`, and expects both to be rejected.
- **Fallback if metadata is not filled at check time:**
  - the seed rasterises the mock SVGs to PNG at seed time;
  - `image/svg+xml` is removed from the bucket allowlist entirely;
  - the decision is recorded in the task.

### 8. Path CHECK
`photos_storage_path_in_category` is `check (storage_path like category_id::text || '/%' and (answer_storage_path is null or answer_storage_path like category_id::text || '/%'))`. It is added `not valid` and then `validate constraint` in the same migration, so existing rows are checked without a long lock. The seed and the admin already write paths this way.

### 9. Statement-level `touch_category`
The per-row trigger is replaced by three statement triggers, one each for `insert`, `update` and `delete`, with transition tables (`referencing new table as new_rows` / `old table as old_rows`). A single function updates `categories.updated_at = now()` once for each distinct `category_id` in the union of the transition tables. The existing behaviour is otherwise kept: moving a photo between categories touches both. The current DB test, "photo change updates the category", keeps passing. A new DB test inserts 60 rows in one statement and asserts the category's `updated_at` moved; the "once" property is checked in the migration test by counting `n_tup_upd` on `categories` before/after (`pg_stat_xact_user_tables`, same transaction).

### 10. Drop `categories_status_idx`
`drop index if exists public.categories_status_idx`. If it is ever needed, a partial index (`where status = 'published'`) can come back. Advisors are re-run after the push.

### 11. Scripts
- **Env precedence:** `remoteEnv()` loads `.env.local` first, then `.env`. The first value set wins, which gives the same precedence as Vite. A unit test is not practical for an `.mjs` script, so this is verified manually with two temp env files.
- **Startup errors:** `localEnv()` rethrows with `{ cause }`, and the message includes the underlying error message.
- **Seed:**
  1. Look up categories by name. With more than one match, throw «Кілька категорій з назвою "X" — видаліть дублікат».
  2. Upload the new files under new photo ids in parallel batches of 8.
  3. Insert the new rows in one statement at positions after the current max.
  4. Delete the old rows, then the old files.
  5. Positions stay offset (they start after the old max). Nothing depends on absolute values: the game shuffles and the admin only orders by position, so renumbering would be a needless extra write.
  6. If step 2 or 3 fails, the old rows and files are untouched and the new files are removed best-effort.
- **`scripts/storage-orphans.mjs`:**
  - lists every object in `photos` (paged `list` per top-level folder);
  - loads all `photos.storage_path` / `answer_storage_path` and the category ids;
  - reports the objects whose folder has no category, or whose path is not referenced by any row;
  - deletes them only with `--apply`;
  - `--remote` works as in the other scripts;
  - npm script `db:storage-orphans`.

## Risks / Trade-offs

- **The `metadata` check:** storage may not have filled `metadata` when the insert policy runs. The DB test exposes this, and the rasterising fallback (decision 7) is ready.
- **`beforeunload` prompt:** browsers show a generic text that we cannot localise. Acceptable.
- **Offset positions after a re-seed:** the seeded positions start at about 13 instead of 0. Nothing depends on the absolute values (ordering only).
- **Statement triggers with transition tables:** these need separate triggers per event when `UPDATE` involves `OLD`/`NEW` tables. Postgres 15+ supports this, and Supabase runs 15+/17.
- **Pushing to the cloud:** the CHECK validates the existing cloud rows. The seed created them with correct paths, and `validate` fails loudly before anything is committed if one does not match.
