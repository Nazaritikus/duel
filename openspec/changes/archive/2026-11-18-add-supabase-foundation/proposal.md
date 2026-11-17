# Proposal

## Why

The offline MVP (phases 1–4) runs on a generated mock catalog. The admin panel (phases 6–7) and real categories in the game (phase 8) need a database, file storage and access rules first. The access rules are the security boundary of a public site: anyone can open it, and only the admin may change content. So they have to be designed and tested before any UI writes to them.

## What Changes

**Tooling (no global installs):**
- the Supabase CLI and the Vercel CLI as `devDependencies`, run with `npx`;
- `supabase/config.toml` from `supabase init`;
- npm scripts `db:start`, `db:reset`, `db:types`, `db:seed`, `db:grant-admin`, `test:db`.

**Two environments:**
- **local:** a Docker stack via `supabase start`, used for development and RLS tests;
- **cloud:** a Supabase project for the Vercel preview, linked with `supabase link`; migrations are pushed with `supabase db push`.

**Migrations:**
- `categories` (`id`, `name`, `hint`, `status` `draft|published`, `cover_path`, `created_at`, `updated_at`);
- `photos` (`id`, `category_id` with cascade delete, `storage_path`, `answer_storage_path`, `answer`, `is_vertical`, `position` unique per category, `created_at`);
- indexes and `updated_at` triggers. A category's `updated_at` also moves when its photos change.

**Admins:**
- an `admins(user_id)` allowlist table and an `is_admin()` SQL function;
- admins are granted with `npm run db:grant-admin -- <email>`. One or more people can be on the list, for example the owner and a content editor. No email is hard-coded in migrations.

**RLS:**
- `anon` and non-admin users read only published categories and their photos;
- only the admin inserts, updates or deletes;
- `admins` is readable only for one's own row.

**Storage:**
- a **private** bucket `photos` with objects at `<category_id>/<photo_id>[.answer].<ext>`;
- read is allowed when the folder's category is published or the reader is the admin;
- write is admin-only.

The game will get signed URLs in phase 8.

**Generated types:** `src/lib/database.types.ts`. `src/lib/supabase.ts` becomes a typed, lazily created client, so the mock-only app does not crash without env vars.

**Seed:** `npm run db:seed` uploads the mock catalog (3 categories, published) into storage and the tables, using the secret key from `.env` / `.env.local`. That key is never exposed to the browser.

**RLS tests (`npm run test:db`):** against the local stack.
- anon reads published only;
- anon writes are rejected;
- a non-admin user is rejected;
- the admin can write;
- storage reads follow the category status.

**Vercel:**
- `vercel.json` with an SPA rewrite;
- the project is linked with the Vercel CLI and the two `VITE_` env vars are set;
- a preview deploy of the current (mock-mode) app.

The hosted app is needed because another person will fill categories through the admin panel from their own device. This phase proves the pipeline early; the admin becomes usable on it after phases 6–7.

`docs/setup.md` describes the one-time steps the owner performs: Docker, the cloud project, logins.

**Game rules:** no change.

**Out of scope:**
- Admin UI and login (phase 6).
- Upload and compression (phase 7).
- Reading categories from Supabase in the game (phase 8).
- Publish-time validation (60 photos, all answered), which phase 6 adds (UI, plus a DB check if needed).
- Production deploy (phase 7, once the admin can upload photos).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- **`admin`:**
  - "Admin authentication": the admin is defined by an allowlist, and storage access mirrors the table rules, with scenarios for draft and published content;
  - added "Content storage layout", covering the bucket privacy and object paths;
  - added "Data integrity", covering cascade delete, unique photo order and the category's last-update time.

## Impact

- **New:**
  - `supabase/` (config, migrations, seed script support);
  - `scripts/seed-supabase.mjs` and `scripts/grant-admin.mjs`;
  - `src/lib/database.types.ts`;
  - `tests/db/*.test.ts` with their own Vitest config;
  - `vercel.json`;
  - `docs/setup.md`.
- **Changed:** `src/lib/supabase.ts` (lazy, typed), `package.json` (scripts, devDependencies `supabase`, `vercel`), `.env.example` (adds `SUPABASE_SECRET_KEY` for scripts only).
- **Dependencies:** `supabase` and `vercel` as dev-only CLIs. Docker Desktop is required for the local stack.
- **Secrets:** the secret key and the DB password live only in `.env` / `.env.local` and the CLIs' own stores. They are never committed and never in `VITE_` vars. All `.env*` files except `.env.example` are git-ignored.
- **Env var names** follow the current Supabase dashboard: `VITE_SUPABASE_PUBLISHABLE_KEY` (was `VITE_SUPABASE_ANON_KEY`) and `SUPABASE_SECRET_KEY`.
