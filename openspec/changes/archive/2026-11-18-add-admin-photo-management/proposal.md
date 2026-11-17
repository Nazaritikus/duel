# Proposal

## Why

Categories can be created and published, but they cannot be filled: there is no way to add photos except the seed script. A content editor needs to fill a 60+ photo category from their own device in minutes. That requires bulk upload with answers taken from file names, a photo grid for fixing answers, and a production URL to work on.

## What Changes

**Bulk upload (category editor):**
- a drop zone per the `AdminCategoryEdit` artboard, plus «оберіть файли»; accepts JPEG, PNG, WebP, AVIF;
- the file name becomes the answer: `fiat-500.jpg` → «Fiat 500» (separators `-`, `_`, `.` and spaces become single spaces; each all-lowercase word gets a capital first letter);
- `<name>.answer.<ext>` becomes the answer photo of `<name>.<ext>` from the same batch, or of an existing photo of the category whose answer equals the derived answer (case-insensitive); an answer file with no match is reported, not uploaded;
- each image is resized in the browser to at most 1600 px on the longer side and encoded as WebP (JPEG if the browser cannot encode WebP); `is_vertical` = height > width after EXIF orientation;
- upload runs three files at a time with progress («Завантажено 12 з 72») and a per-file error list; new photos are appended after the last position.

**Photo grid (category editor):**
- cards per the artboard, five per row: question photo, answer photo or an «фото відповіді» add slot, «вертикальне» badge, inline answer input with a red border and «Немає відповіді» when empty, hint «Окреме фото відповіді» / «Відповідь на тому ж фото»;
- the answer saves on blur or Enter;
- add / replace / remove the answer photo;
- delete a photo after an in-card confirmation, removing its storage files and its row;
- thumbnails use signed URLs (1 h) and lazy loading.

**Categories list:** the cover column shows the category's first photo (signed URL) instead of the placeholder.

**Production deploy:**
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` added to the Vercel Production environment;
- `vercel deploy --prod`; the production URL is recorded in `docs/setup.md` and the roadmap;
- the cloud Supabase Auth Site URL and redirect URLs are set to the production domain (plus localhost for development), pushing only those two settings.

**Game rules:** no change.

**Out of scope:**
- Reordering photos (positions are append-only; the game shuffles anyway).
- Server-side image processing or Supabase image transformations.
- Granting the content editor: their email is unknown; the owner runs `npm run db:grant-admin -- --remote <email>`.
- The game reading Supabase (phase 8).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- **`admin`:**
  - "Bulk photo upload": answer formatting rules, pairing with existing photos, unmatched answer files, accepted formats, progress and errors;
  - "Photo editing": save on blur/Enter, empty-answer marking, in-card delete confirmation;
  - added "Category cover" (first photo in the list);
  - added "Production access" (production URL, magic link returns to it).

## Impact

- **New:** `src/features/admin/upload/*` (file-name parsing and pairing, image compression, upload queue), `PhotoGrid`/`PhotoCard`/`UploadZone` components, tests.
- **Changed:** `adminApi.ts` (photo methods, cover URLs), `CategoryEditorPage.tsx`, `CategoriesPage.tsx`, `admin.css`, `docs/setup.md`, `CLAUDE.md` (deploy line).
- **Cloud:** Vercel Production env vars and deploy; Supabase Auth URL settings. No schema change.
- **Dependencies:** none (Canvas API for compression).
