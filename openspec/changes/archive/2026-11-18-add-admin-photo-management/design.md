# Design

## Context

- Phase 6 built the admin shell, the categories list and the editor. The editor has an empty-state block where the photo grid goes. All backend access goes through `AdminApi` (`src/features/admin/adminApi.ts`), and tests use a fake.
- Storage: a private bucket `photos`, 5 MB per file, MIME types webp/jpeg/png/avif/svg. Paths are `<category_id>/<photo_id>.<ext>` and `<category_id>/<photo_id>.answer.<ext>`. RLS lets admins read and write everything.
- `photos.position` is unique per category and deferrable; the game shuffles, so the order is not visible to players.
- Vercel project `duel`: env vars exist for Preview only. Supabase cloud Auth still has `site_url = http://localhost:3000` and no redirect URLs. `supabase config push` pushes every declared property, and the repo's `config.toml` differs from the cloud in MFA, confirmations and pooler settings.

## Goals / Non-Goals

**Goals:** fill a 60+ photo category in a few minutes; the editor can work from the production URL.

**Non-Goals:** reordering, server-side image processing, image CDN transformations, game integration (phase 8).

## Decisions

### 1. Pure upload core (`src/features/admin/upload/`)
- `fileNames.ts`:
  - `parseFileName(name)` → `{ base, isAnswer, ext }`. The extension is the last segment. `isAnswer` is set when the remaining name ends with `.answer` (case-insensitive), which is then stripped.
  - `answerFromName(base)`: split on `[-_.\s]+`, drop empties, capitalise the first letter of every all-lowercase word, join with spaces (`iPhone-15` keeps `iPhone`).
  - `planUpload(files, existing)` → `{ items: UploadItem[], errors }`:
    - question files become items, with the answer photo from the same batch when the bases match case-insensitively;
    - a leftover answer file attaches to the existing photo whose answer equals the derived answer (case-insensitive, trimmed) as an `attach` item;
    - otherwise it becomes an error;
    - non-image extensions become errors;
    - items keep the order the files were given.
- `image.ts`:
  - `targetSize(w, h, max = 1600)` is pure;
  - `compressImage(file)` uses `createImageBitmap(file, { imageOrientation: 'from-image' })` and a canvas, then `toBlob('image/webp', 0.85)`, falling back to `image/jpeg` when the blob comes back with another type;
  - it returns `{ blob, ext, width, height }`, and `isVertical = height > width`.
- `queue.ts`: `runQueue(tasks, concurrency, onSettled)` resolves when all tasks have settled. It is tested with fake tasks.

### 2. `AdminApi` photo methods
```ts
listPhotos(categoryId): Promise<AdminPhoto[]>           // ordered by position, with signed URLs
addPhoto({ categoryId, position, answer, image, answerImage? }): Promise<void>
attachAnswerPhoto(photo, image): Promise<void>           // add or replace
removeAnswerPhoto(photo): Promise<void>
updateAnswer(photoId, answer): Promise<void>
deletePhoto(photo): Promise<void>
```
- **`addPhoto`:**
  - generates the photo id in the client (`crypto.randomUUID()`);
  - uploads the question file (and the answer file) with `contentType`, then inserts the row;
  - if the insert fails, it removes the uploaded files.
- **`attachAnswerPhoto`:** uploads to `<cat>/<id>.answer.<ext>` with `upsert: true` and updates the row. If the old answer path had another extension, it removes the old file afterwards.
- **`deletePhoto`:** removes the storage objects, then the row (the same order as the category delete).
- **`listPhotos`:** signs all paths in one `createSignedUrls` call (TTL 3600 s).
- **`listCategories`:** also selects `photos(storage_path, position)` and signs each category's lowest-position path in one batch for the cover. If signing fails, the list falls back to the placeholder.
- **Positions:** `max(position) + 1 + i`, computed once per batch from the loaded photos. A second admin uploading to the same category at the same time could collide; the unique constraint rejects that photo, which the admin sees as a per-file error and can retry. Acceptable for one or two editors.

### 3. Editor UI
- `UploadZone`: a drop target (`dragover`/`drop`) and a visually styled `<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif">`.
  - While uploading it shows a progress bar with text, and the error list stays after the upload finishes.
  - After the batch it reloads the photos and the category stats.
- `PhotoGrid` / `PhotoCard` per the artboard: 5 columns (fewer on narrow screens), and a 120 px image strip split 3fr/2fr. Each card has:
  - the question image (`object-fit: cover`), the trash button and the vertical badge;
  - the answer image with a green inset frame and a remove button, or an «фото відповіді» add button that opens a hidden file input;
  - the answer input, which saves on blur or Enter when the value changed and shows «Збереження…» / an error under the field.
- The «Видалити фото» button switches the card into a confirmation state («Видалити фото?» Так / Ні).
- The editor keeps the photos in its own state. After an answer edit it updates the stats locally, so the publish reasons refresh without a refetch.

### 4. Production deploy
- Env vars: `npx vercel env add NAME production` with the value piped from `.env` through a small Node one-liner that never prints it. Only the two `VITE_` vars; never the secret key.
- `npx vercel deploy --prod --yes`. The stable production alias (`duel-*.vercel.app` or the project domain) comes from `vercel inspect` / the deploy output.
- **Supabase Auth URLs:** a temporary workdir holds a minimal `supabase/config.toml` declaring only `[auth] site_url` (production URL) and `additional_redirect_urls` (`<prod>/admin`, `http://localhost:5173/admin`, `http://127.0.0.1:5173/admin`). It runs `npx supabase config push --remote=<ref> --yes --workdir <tmp>`, so no other cloud setting changes. *Alternative:* `[remotes]` in the repo config — rejected, because it would still push the base sections that differ from the cloud.
- Production deployment protection stays as configured (previews protected, production public).

### Decisions made autonomously
1. **Answer capitalisation:** capitalise the first letter of each all-lowercase word; keep mixed-case words (`iPhone`).
2. **Answer files may attach to existing photos** by matching the derived answer; unmatched answer files are errors, not new photos.
3. **WebP at quality 0.85, JPEG fallback**; 1600 px on the longer side; EXIF orientation applied before measuring `is_vertical`.
4. **Concurrency 3**, with append-only positions and no reordering UI.
5. **Cover = first photo** by position; `cover_path` stays unused.
6. **Minimal Supabase config push** for Auth URLs only (§4).
7. **Answer saves on blur/Enter**, not with a separate save button.

## Risks / Trade-offs

- **Large HEIC files from iPhones** cannot be decoded by Chrome. → They are reported per file; the editor can export JPEG. A HEIC decoder library is not worth its size for now.
- **Signed URLs expire after 1 h** in a long editing session. → A page reload refreshes them; the editor rarely stays open that long.
- **Memory:** decoding 70 large photos at three at a time is fine on desktop; on phones it is slower but works.
- **The built-in Supabase mailer** limits magic links per hour on the production project. → Owner follow-up: custom SMTP.

## Migration Plan

No schema change. Deploy order: build passes → set Vercel prod env → `vercel deploy --prod` → push Auth URL settings → request a magic link against production to confirm the redirect (without completing a sign-in to a real mailbox).
