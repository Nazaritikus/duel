# Design

## Context

- `supabase/migrations/` is empty, and there is no `supabase/config.toml`.
- `src/lib/supabase.ts` creates an untyped client at import time and throws if env vars are missing. Nothing imports it yet.
- The app runs fully on `createMockCategorySource()`.
- Neither the Supabase CLI, the Vercel CLI nor Docker is installed on the dev machine.
- The owner chose a local Docker stack for development plus a cloud project for the Vercel preview, deployed via the Vercel CLI.

See proposal.md for scope. Requirements are in this change's `admin` delta.

## Goals / Non-Goals

**Goals:**
- Migrations are the single source of truth. They apply cleanly to an empty database, both local and cloud.
- Access rules are enforced by Postgres and Storage policies, not by UI, and are covered by automated tests against a real Postgres.
- No secret ever reaches the client bundle or git.

**Non-Goals:**
- Using Supabase from the game or admin UI (phases 6–8).
- Server-side publish validation (phase 6 decides).
- CI for DB tests: they run locally for now, because CI would need Docker in the pipeline.

## Decisions

### 1. CLIs as devDependencies
`supabase` (npm package of the CLI) and `vercel` go into `devDependencies` and are always called through npm scripts / `npx`. This pins versions per repo and avoids global installs.

Docker Desktop is the one machine-level prerequisite for the local stack. The owner installs it, and it is documented in `docs/setup.md`.

### 2. Schema
```sql
create type category_status as enum ('draft', 'published');

create table categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  hint        text,
  status      category_status not null default 'draft',
  cover_path  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table photos (
  id                   uuid primary key default gen_random_uuid(),
  category_id          uuid not null references categories(id) on delete cascade,
  storage_path         text not null unique,
  answer_storage_path  text unique,
  answer               text not null default '',
  is_vertical          boolean not null default false,
  position             integer not null check (position >= 0),
  created_at           timestamptz not null default now(),
  constraint photos_category_position_key unique (category_id, position)
    deferrable initially deferred
);
create index categories_status_idx on categories (status);
```
- **Key types:** `uuid` keys, because ids appear in storage paths and URLs. `text` everywhere, with lengths checked only where meaningful. `timestamptz` throughout.
- **`answer`** defaults to `''`, because a freshly uploaded photo has no answer yet. Phase 6 publish validation requires every answer to be non-empty.
- **The `(category_id, position)` unique key** also serves as the index for "photos of a category in order". It is deferrable so phase 7 reordering can swap positions inside one transaction.
- **An enum for status:** there are two fixed values, and it gives the generated types a closed union. *Alternative:* `text` + check. Equivalent, but the enum yields a nicer TS type.

### 3. `updated_at` triggers
- `set_updated_at()` is a `before update` trigger on `categories`.
- `touch_category()` is an `after insert/update/delete` trigger on `photos`. It updates the parent category's `updated_at` (for an update that moves `category_id`, it touches both categories). This implements "Photo change updates the category".

### 4. Admins via an allowlist table
```sql
create table admins (user_id uuid primary key references auth.users(id) on delete cascade);
create function private.is_admin() returns boolean
  language sql stable security definer set search_path = ''
  as $$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;
```
- `security definer` lets policies call `is_admin()` without granting anyone `select` on `admins`. `search_path = ''` prevents search-path hijacking.
- `admins` has RLS enabled with one policy: users can `select` their own row. Phase 6 uses it to show "not an admin".
- Rows are inserted only with the service role, through `scripts/grant-admin.mjs <email>`, which looks the user up with the Auth admin API.

*Alternative:* a custom JWT claim via an auth hook. Rejected: more moving parts for a short allowlist, and a claim needs a re-login to change.

The list may hold more than one person: the owner and a content editor who fills categories from their own device.

### 5. RLS policies
RLS is enabled on all three tables, and there are no policies for `delete` / `update` by anyone except the admin. Policies are written per command for clarity.

| Table | select | insert / update / delete |
|---|---|---|
| `categories` | `status = 'published' or is_admin()` | `is_admin()` |
| `photos` | `exists (select 1 from categories c where c.id = category_id and c.status = 'published') or is_admin()` | `is_admin()` |
| `admins` | `user_id = auth.uid()` | — (service role only) |

New tables are no longer exposed to the Data API automatically (Supabase breaking change, 2026), so the schema migration grants `select` to `anon` / `authenticated` and writes to `authenticated` explicitly. RLS is enabled in that same migration, so a table is never exposed without it.

### 6. Storage: private bucket, policies by folder
- The migration inserts the bucket `photos` (`public = false`, `allowed_mime_types` image/*, `file_size_limit` 5 MB).
- Policies on `storage.objects`:
  - **select:** `bucket_id = 'photos' and (is_admin() or exists (select 1 from public.categories c where c.id::text = (storage.foldername(name))[1] and c.status = 'published'))`;
  - **insert / update / delete:** `bucket_id = 'photos' and is_admin()`.
- The game (phase 8) will call `createSignedUrls` for a whole category in one request (expiry about 2 h). The select policy above is what lets anon get those URLs.

*Alternative:* a public bucket. Rejected: draft photos would be reachable by URL, against the spec. Unguessable uuids are not access control.

### 7. Typed, lazy client
```ts
export function getSupabase(): SupabaseClient<Database>  // creates once, throws a clear error if env is missing
```
- Types come from `npm run db:types`, which runs `supabase gen types typescript --local > src/lib/database.types.ts`. The file is committed, and regenerated whenever migrations change.
- Laziness keeps the mock-only app (and tests) working without env vars.

### 8. Seed via a script, not `seed.sql`
Files cannot be uploaded from SQL. `scripts/seed-supabase.mjs`:
1. reads `SUPABASE_URL` and `SUPABASE_SECRET_KEY` from the environment / `.env` / `.env.local`;
2. reads `public/mock/catalog.json`;
3. for each category, upserts by name, deletes existing photos and their files, then uploads each SVG (and answer SVG) to `<category_id>/<photo_id>[.answer].svg`, inserts the rows with positions, and marks the category published.

The script is idempotent, so it is safe to re-run. It works against local (keys from `supabase status`) and cloud (keys the owner puts in `.env` / `.env.local`).

The mock categories have fewer than 60 photos. That is fine for seed data; phase 6 enforces the minimum only when publishing through the UI.

### 9. DB tests
- `tests/db/rls.test.ts` runs under `vitest.db.config.ts` (`npm run test:db`), only against the local stack. It uses the local URL and keys from `supabase status -o env`, loaded by the npm script.
- The suite creates throwaway users with the Auth admin API (random email and password, local only), grants one of them admin, and cleans up after itself.
- It covers every scenario of the `admin` delta, plus storage reads (published vs draft).
- `npm test` is unchanged, so the default suite needs no Docker.

### 10. Vercel

Why hosting: a content editor will use the admin panel from another device, so the app has to live at a public URL. The game itself could run locally, but the same deploy serves it too.

- `vercel.json`: `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }` so `/admin/*` works on reload.
- Framework preset Vite, build `npm run build`, output `dist`.
- **Owner steps:** `npx vercel login`, `npx vercel link`.
- **Env vars:** `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are added for Preview with `vercel env add`. The publishable key is public by design, and RLS is what protects data.
- **Deploy:** `npx vercel deploy` produces a preview URL. The app still uses the mock source, so this deploy proves the pipeline. Supabase data appears in phase 8.

### 11. Who does what
These steps need the owner's accounts and secrets, so they are listed in `docs/setup.md` and tasks mark them as owner steps:
1. install Docker Desktop;
2. create the Supabase cloud project;
3. `npx supabase login` and `npx supabase link`, which ask for the DB password;
4. put the secret key in `.env` / `.env.local`;
5. `npx vercel login`.

Claude runs everything else and never types or prints secret values.

### 12. Changes made during implementation
- **`is_admin()` lives in a non-exposed `private` schema.** A `security definer` function in `public` is callable by anyone through the Data API. Policies call `private.is_admin()`; `anon` / `authenticated` get `usage` on the schema and `execute` on that one function.
- **Explicit grants** in the schema migration (see §5).
- **Trigger functions** have `execute` revoked from API roles.
- **The local stack keys** come from `supabase status -o json` (`scripts/supabase-env.mjs`), so the local workflow needs no `.env`. `--remote` reads `.env` / `.env.local`.
- **`supabase db advisors` reports no issues.**

## Risks / Trade-offs

- **[A policy mistake exposes drafts or allows writes]** → Automated RLS tests for every scenario, run before archive and after any migration change.
- **[`security definer` function misuse]** → It only returns a boolean, has a pinned empty `search_path`, and has `execute` revoked from `public`, then granted to `anon` and `authenticated` explicitly.
- **[Local and cloud schemas drift]** → Only migrations change the schema. No dashboard edits; `supabase db push` applies the same files.
- **[Generated types go stale]** → `db:types` runs in the same task as any migration change. Phase 8 compiles against them.
- **[Docker not available]** → The default `npm test` and the app keep working. Only `test:db`, `db:*` and local seeding need Docker.

## Migration Plan

Fresh databases only; there is no existing data.
- **Rollback (local):** `supabase db reset`.
- **Rollback (cloud):** before phase 8 nothing depends on the data, so the project can be reset from the dashboard.
