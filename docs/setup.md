# Setup

One-time steps for the project owner. Everything after these steps is scripted (`npm run …`).
The Supabase and Vercel CLIs are dev dependencies, so always call them through `npx`, never as global installs.

## 1. Local stack (development and RLS tests)

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) and start it.
2. Start the local Supabase stack. The first run downloads the images (a few GB).
   ```bash
   npm run db:start
   npm run db:reset      # apply all migrations to a clean local DB
   npm run db:seed       # upload the mock catalog (3 published categories)
   npm run test:db       # RLS / storage policy tests
   ```
3. The local dashboard (Studio) is at http://127.0.0.1:54323. `npx supabase status` prints the URLs and keys.
4. Stop the stack with `npm run db:stop`.

The local stack needs no `.env`: scripts and tests read the local keys from `supabase status`.

## 2. Cloud project (preview / production)

1. Create a project at https://supabase.com/dashboard (region: Central EU, Frankfurt). Save the database password in your password manager.
2. Log in and link the repo:
   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref>   # asks for the database password
   ```
   - `login` opens a browser and stores a token with access to your whole account.
   - For CI, use a scoped personal access token in `SUPABASE_ACCESS_TOKEN` instead.
3. Put the keys into `.env` (or `.env.local`) in the repo root. Copy them from **Project Settings → API Keys**. Both files are git-ignored.
   ```
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   SUPABASE_SECRET_KEY=sb_secret_...
   ```
   - `VITE_*` values are bundled into the browser app. The publishable key is public by design, and RLS protects the data.
   - `SUPABASE_SECRET_KEY` bypasses RLS. It is used only by `scripts/*.mjs` on your machine. Never prefix it with `VITE_` and never commit it.
4. Apply the migrations and seed the cloud project:
   ```bash
   npx supabase db push --remote   # asks for confirmation before changing the hosted project
   npm run db:seed -- --remote     # uses VITE_SUPABASE_URL + SUPABASE_SECRET_KEY from .env
   ```

## 3. Admins

Admins are rows in the `admins` table. There can be more than one admin, for example you and a content editor.

```bash
npm run db:grant-admin -- you@example.com              # local stack
npm run db:grant-admin -- --remote editor@example.com  # cloud project
```

The script creates the Auth user if it does not exist yet; that user then signs in with a magic link (phase 6).

## 4. Vercel preview

```bash
npx vercel login
npx vercel link                                             # create / pick the project
npx vercel env add VITE_SUPABASE_URL preview                # paste the value when asked
npx vercel env add VITE_SUPABASE_PUBLISHABLE_KEY preview
npx vercel deploy                                           # prints the preview URL
```

`vercel.json` rewrites every path to `index.html`, so `/admin/*` survives a reload.
Production deploy comes in phase 7.

## Schema changes

- Every schema change is a migration in `supabase/migrations/`. Create one with `npx supabase migration new <name>`.
- Never change the schema in the dashboard.
- After a migration change, run:
  ```bash
  npm run db:reset && npm run db:types && npm run test:db
  ```
