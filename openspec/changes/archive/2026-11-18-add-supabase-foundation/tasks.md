# Tasks

## 1. Tooling and owner prerequisites

- [x] 1.1 Add `supabase` and `vercel` as devDependencies, run `npx supabase init` (`supabase/config.toml`), and add the npm scripts `db:start`, `db:stop`, `db:reset`, `db:types`, `db:seed`, `db:grant-admin`, `test:db`. Verify that `npx supabase --version` and `npx vercel --version` run.
- [x] 1.2 Write `docs/setup.md` (owner steps: Docker Desktop, cloud project, `supabase login` / `link`, `.env` / `.env.local` keys, `vercel login`) and check `.env.example` has `VITE_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` (scripts only). Verify that the doc lists every command in order and every `.env*` file except `.env.example` is git-ignored.
- [x] 1.3 **Owner step:** install Docker Desktop. Then `npm run db:start` brings up the local stack. Verify that `npx supabase status` shows the API URL.

## 2. Schema, triggers, admin allowlist

- [x] 2.1 Migration `..._schema.sql`: `category_status`, `categories`, `photos`, the indexes and constraints from design §2. Verify that `npm run db:reset` applies it to a clean DB without errors.
- [x] 2.2 Migration `..._triggers.sql`: `set_updated_at` on categories and `touch_category` on photos (insert / update / delete, including moving `category_id`). Verify with tests in `tests/db`: a photo edit bumps the category's `updated_at`, and a duplicate position is rejected.
- [x] 2.3 Migration `..._admins.sql`: the `admins` table, the `is_admin()` security-definer function with pinned `search_path` and explicit grants, and the own-row select policy. Add `scripts/grant-admin.mjs <email>`. Verify with a test that `is_admin()` is true only for a granted user.

## 3. RLS and storage policies

- [x] 3.1 Migration `..._rls.sql`: enable RLS and add the per-command policies on `categories` and `photos` (design §5). Verify with `tests/db/rls.test.ts` for "Anonymous write blocked", "Draft hidden from the public", "Signed-in non-admin" and "Admin writes" (table part), plus "Cascade delete".
- [x] 3.2 Migration `..._storage.sql`: the private bucket `photos` (image MIME types, 5 MB) and the `storage.objects` policies by folder (design §6). Verify with tests for "Published photo readable" (anon signed URL works), "Draft photo not readable", anon upload rejected and admin upload allowed.
- [x] 3.3 Set up `vitest.db.config.ts` and the `test:db` script that loads the local keys from `supabase status -o env`. Verify that `npm run test:db` passes and `npm test` still runs without Docker.

## 4. Types, client, seed

- [x] 4.1 Run `npm run db:types` → `src/lib/database.types.ts`. Make `src/lib/supabase.ts` a lazy typed `getSupabase()` reading `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Verify that `npm run build` passes, and that a unit test shows a clear error when the env is missing and no throw on import.
- [x] 4.2 Add the `scripts/seed-supabase.mjs` idempotent seed from `public/mock/catalog.json` (upload, rows, published). Verify that running it twice locally gives 3 published categories with 12/10/8 photos, and that anon can list them and sign a URL.

## 5. Cloud project and Vercel preview

- [x] 5.1 **Owner step:** create the Supabase cloud project, `npx supabase login`, `npx supabase link --project-ref <ref>`, and put the cloud URL / keys in `.env` / `.env.local`. Then run `npx supabase db push` and the seed against the cloud. Verify that `npx supabase migration list` shows local = remote, and that an anon query against the cloud returns 3 published categories.
- [x] 5.2 Add `vercel.json` (SPA rewrite). **Owner step:** `npx vercel login`. Then `npx vercel link`, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for Preview, and run `npx vercel deploy`. Verify that the preview URL opens the setup screen and `/admin` survives a reload.

## 6. Wrap-up

- [x] 6.1 Update `CLAUDE.md` (commands: `db:*`, `test:db`; data model: `admins`, private bucket, path layout) and the `docs/roadmap.md` phase 5 bullets if the scope changed. Verify that `npm run build`, `npm run lint`, `npm test` and `npm run test:db` all pass.

## Workflow follow-up

- Run `npx @fission-ai/openspec validate --all --strict`, then `/openspec-archive-change`.
- Update `docs/roadmap.md`: phase 5 → `✔ <date>`, fill the "Result" column and add the phase summary.
