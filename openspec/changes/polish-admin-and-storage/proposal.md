# Proposal: polish-admin-and-storage

## Why

The 2026-11-18 code review and UI audits found admin and storage issues that lose work or leave the data in a bad state.

**Admin work lost without warning:**
- Leaving the editor discards unsaved name or hint edits silently.
- Leaving during a bulk upload cuts the batch off without telling anyone.
- The delete confirmations drop keyboard focus to `<body>`.

**Data and scripts:**
- The `photos` bucket accepts SVG from any admin upload, although only the mock seed needs it.
- Maintenance scripts let `.env` override `.env.local`, the opposite of Vite, so `--remote` scripts can target the wrong project.
- Re-seeding briefly leaves published categories empty.
- Files can be orphaned when a category row is deleted outside the admin.

The fixes are cheap now, while the cloud holds only test data.

## What Changes

**Admin UI**
- **Unsaved-changes guard:**
  - leaving the category editor with unsaved name or hint edits asks «Залишити сторінку? Незбережені зміни буде втрачено»;
  - leaving while photos are uploading asks the same about the remaining files;
  - both in-app navigation and tab close or reload are covered.
- **Delete confirmations** (category, photo) become native modal dialogs:
  - focus starts on «Скасувати»;
  - the buttons read «Видалити» / «Скасувати» instead of «Так» / «Ні»;
  - focus returns to the trigger.
- **Editor validation:** a failed save focuses the name field (`required`, invalid styling after interaction).
- **Upload progress:** a native `<progress>`. Only the final «Готово…» line is announced to screen readers, not every file.
- **Categories list:**
  - a real `<table>` with a hidden caption;
  - the search is `type="search"` inside `<search>`;
  - the query is kept in the URL (`?q=`) so a reload keeps it.
- **Small fixes:**
  - the IME composition guard on Enter in the answer field;
  - the first row of thumbnails loads eagerly;
  - `spellcheck`/`autocorrect` off on the login email;
  - consistent focus rings on the nav links and logout.

**Storage and database (forward migrations)**
- **No SVG from admin uploads:** API roles can no longer upload SVG to `photos`, while the seed (secret key) still can. Real uploads stay WebP/JPEG/PNG/AVIF.
- **Path check:** a CHECK constraint makes `photos.storage_path` / `answer_storage_path` start with `<category_id>/`, matching the documented layout and the folder-based storage rules.
- **Trigger:** `touch_category` runs once per statement, so a bulk photo write bumps each category once.
- **Index:** the unused `categories_status_idx` is dropped.

**Scripts**
- **Env loading:** `.env.local` takes precedence over `.env` (the same order as Vite).
- **Startup errors:** the "Local Supabase is not running" message keeps the real cause.
- **Seed:**
  - refills a category without emptying it first: it uploads the new files, inserts the new rows, then removes the old ones;
  - fails loudly when two categories share the seeded name;
  - uploads each category's files in parallel batches.
- **New `npm run db:storage-orphans [-- --remote] [--apply]`:** lists the files in `photos` whose category folder or photo row no longer exists, and deletes them only with `--apply`.

## Out of scope

- **Game rules and the play UI:** no changes. The play UI is covered by `harden-host-and-a11y`.
- **Category names:** no unique constraint. Duplicate names stay allowed for admins; only the seed refuses to guess between them.
- **Database-triggered file deletion:** Supabase does not allow deleting storage objects from SQL. Orphans are handled by the UI's files-first delete (unchanged) plus the new manual script.
- **Admin visuals:** no hover-state pass and no container-query rework.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `admin`:
  - "Bulk photo upload": leave warning, accessible progress;
  - "Photo editing": dialog confirmation with specific labels and focus;
  - "Content storage layout": raster types only for admins, enforced path prefix;
  - "Data integrity": one category touch per write;
  - "Category list search": query kept in the URL;
  - "Category editor fields": focus the invalid field, unsaved-changes guard;
  - "Delete category": dialog confirmation;
  - added "Maintenance script environment" (env precedence), "Non-destructive re-seed" and "Orphaned file cleanup".

## Impact

- **Admin code (`src/features/admin/`):**
  - `CategoryEditorPage.tsx`, `PhotoCard.tsx`, `PhotoUploader.tsx`, `CategoriesPage.tsx`;
  - `LoginPage.tsx`, `AdminShell.tsx`, `admin.css`;
  - new: a `ConfirmDialog` component and a `useLeaveGuard` hook built on `useBlocker` and `beforeunload`.
- **Migrations:** one forward migration (storage policy, CHECK, trigger, index), then `db:types` and new or updated `tests/db/*`. It must be pushed to the cloud with `npx supabase db push --remote`.
- **Scripts:** `scripts/supabase-env.mjs`, `scripts/seed-supabase.mjs`, and new `scripts/storage-orphans.mjs` with an npm script.
- **Docs:** `docs/setup.md`, CLAUDE.md commands.
