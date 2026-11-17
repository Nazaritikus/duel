# Tasks

## 1. Source

- [x] 1.1 `supabaseCategorySource.ts` (design §1) with unit tests on a stubbed client: published filter applied to both queries, photo counts, empty categories skipped, sorted by name, signed URLs mapped to `src`/`answerSrc`, unsigned photos dropped, empty category throws.
- [x] 1.2 `categorySource.ts` (`createCategorySource(env)`, design §2) with tests; wire into `routes.tsx`; `.env.example` gets `VITE_CATEGORY_SOURCE`.
- [x] 1.3 DB test: anon and a signed-in admin listing through the source's query see only published categories; anon can sign a published category's photo URLs.

## 2. Preloading

- [x] 2.1 `imagePreloader.ts` and `preloadPlan.ts` with tests: decode awaited, cache hit, LRU eviction, failure evicted, plan order and nulls skipped, end of list.
- [x] 2.2 `GameFlow` start sequence (design §4) and `usePreloadPhotos` in `ActiveGame`, with a `preloader` prop. Component tests with a fake preloader: the first photos of the seeded order are preloaded before the countdown appears; the next photos are preloaded after a turn; start continues after a preload failure; a load error keeps setup with the message.

## 3. Failure state

- [x] 3.1 `PhotoFrame` shows «Фото не завантажилось» on image error. Test.

## 4. Verification and deploy

- [x] 4.1 `npm test`, `npm run test:db`, `npm run build`, `npm run lint`, `openspec validate --all --strict`.
- [x] 4.2 Browser: local dev against the local stack plays a seeded category end to end (setup lists published only while an admin is signed in, photos change instantly). Note the visual check.
- [x] 4.3 Docs (`docs/setup.md`, `CLAUDE.md`: the flag and the source); `npx vercel deploy --prod`; verify that production lists the cloud's published categories.
