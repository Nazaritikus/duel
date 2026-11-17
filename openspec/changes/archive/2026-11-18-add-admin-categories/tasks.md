# Tasks

## 1. Database

- [x] 1.1 Migration `…_publish_rule.sql` with `enforce_publish_rule()` and its trigger (design §5). Run `db:reset`, `db:types`. Verify with `tests/db/publish.test.ts`: admin publish of 59 answered photos rejected; 60 photos with one empty answer rejected; 60 answered photos published; service-role publish of a small category allowed; editing a published category's name still allowed.
- [x] 1.2 Push to the cloud (`npx supabase db push --remote --yes`) and run `npx supabase db advisors --remote`. Verify `migration list` shows local = remote and advisors report nothing new.

## 2. Admin API and auth

- [x] 2.1 `src/features/admin/publishRules.ts` (`MIN_PHOTOS`, `getPublishProblems`) and `formatUpdated` date helper, with unit tests (0/59/60 photos, missing answers, plurals, today / this year / other year).
- [x] 2.2 `adminApi.ts`: `AdminApi` interface, `createSupabaseAdminApi(client)` (design §1, §2, §6), `AdminApiContext`. Switch `getSupabase()` to the PKCE flow. Verify with unit tests on a stubbed client: unknown-email error maps to success, rate-limit error surfaces, delete removes files before the row.
- [x] 2.3 `useAdminSession` and `RequireAdmin` with tests: loading, signed-out redirect to login, non-admin no-access page with logout, admin sees the outlet.

## 3. Screens

- [x] 3.1 Admin shell (sidebar per artboard, email, «Вийти», «Відкрити гру →») and `LoginPage` (email form, neutral confirmation, error text). Tests: submit calls the API, confirmation shown, error shown, already signed-in admin is sent to `/admin`.
- [x] 3.2 `CategoriesPage`: table per `AdminCategories` (count red < 60, status badge, date, «Редагувати»), search, empty state, «Нова категорія». Tests: rows render, red count below 60, search filters case-insensitively.
- [x] 3.3 `CategoryEditorPage` for new and existing categories: name/hint, save, publish/unpublish with reasons, summary line, delete with in-page confirmation, photo-grid empty state. Tests: blank name refused, create navigates to the new id, reasons listed and publish disabled, unpublish, delete confirm/cancel.
- [x] 3.4 Routes: lazy `AdminApp` with nested routes replacing `AdminStub`; «Supabase не налаштовано» fallback. Update `routes.test.tsx`. Verify `npm run build` shows the admin in a separate chunk.

## 4. Verification and docs

- [x] 4.1 Run `npm test`, `npm run test:db`, `npm run build`, `npm run lint`, `npx @fission-ai/openspec validate --all --strict`.
- [x] 4.2 Local end-to-end in the browser: grant a throwaway `@duel.test` admin, request a link, open it from Mailpit, create a category, see publish blocked with reasons, rename, delete. If the Chrome extension is unavailable, note that the visual check was skipped.
- [x] 4.3 `docs/setup.md`: admin login section (local Mailpit, cloud Site URL / redirect URLs set in phase 7).
