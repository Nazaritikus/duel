# Tasks

## 1. Upload core

- [x] 1.1 `upload/fileNames.ts`: `parseFileName`, `answerFromName`, `planUpload` (design §1) with unit tests: `fiat-500.jpg` → «Fiat 500», `eiffel_tower.jpg` → «Eiffel Tower», `iPhone-15.png` → «iPhone 15», pairing in a batch (case-insensitive), attaching to an existing photo, unmatched answer file error, non-image error, order kept.
- [x] 1.2 `upload/image.ts` (`targetSize`, `compressImage`) and `upload/queue.ts` (`runQueue`) with tests: landscape/portrait/small images, concurrency never above the limit, failures do not stop the queue.

## 2. API

- [x] 2.1 `AdminApi` photo methods and `AdminPhoto` type (design §2), plus the cover URL in `listCategories`. Unit tests on a stubbed client: `addPhoto` uploads then inserts and cleans up files on insert failure; `deletePhoto` removes files before the row; `attachAnswerPhoto` removes an old answer file with a different extension.
- [x] 2.2 Extend the fake API. Add a DB test that an admin can upload a WebP and an answer file, insert the row, replace the answer with `upsert` and delete both files.

## 3. Editor UI

- [x] 3.1 `UploadZone` with drop and file picker, progress and an error list; the editor runs `planUpload` → compress → `addPhoto`/`attachAnswerPhoto` through the queue and reloads. Component tests with a fake compressor: progress text, errors listed, photos appear.
- [x] 3.2 `PhotoGrid`/`PhotoCard` per the artboard: answer inline edit (blur/Enter), empty-answer marking, answer photo add/replace/remove, delete with confirmation, vertical badge; stats and publish reasons update after edits. Component tests for each.
- [x] 3.3 Cover thumbnails in the categories list; placeholder when there is none. Test.

## 4. Verification

- [x] 4.1 `npm test`, `npm run test:db`, `npm run build`, `npm run lint`, `openspec validate --all --strict`.
- [x] 4.2 Local browser check against the artboard: upload real JPEGs (including an `.answer` pair and a portrait image), edit an answer, replace and remove an answer photo, delete a photo, see the cover in the list.

## 5. Production

- [x] 5.1 Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to Vercel Production (values piped, never printed); `npx vercel deploy --prod`. Verify that the production URL serves the game and `/admin/login`.
- [x] 5.2 Push only Auth `site_url` and `additional_redirect_urls` to the cloud project (design §4); verify with `supabase config diff` that only those changed.
- [x] 5.3 Docs: production URL and editor onboarding (`db:grant-admin -- --remote`) in `docs/setup.md`; CLAUDE.md deploy line.
