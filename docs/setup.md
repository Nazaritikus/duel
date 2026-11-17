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

The script creates the Auth user if it does not exist yet; that user then signs in with a magic link.

### Admin login

- Open `/admin`, enter the email and press «Надіслати посилання». Open the link **in the same browser** (the PKCE flow keeps a verifier there).
- Links are sent only to existing users, so only granted emails can sign in; the login form never creates accounts.
- **Local:** emails go to Mailpit at http://127.0.0.1:54324. The dev server must point at the local stack. With the cloud URL in `.env`, override it for one run:
  ```bash
  VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_PUBLISHABLE_KEY=<PUBLISHABLE_KEY from `npx supabase status`> npm run dev
  ```
- **Cloud:** the Auth Site URL and redirect URLs must include the app's domain (set for production in phase 7). The built-in Supabase mailer sends only a few emails per hour; configure custom SMTP in the dashboard if that becomes a limit.

## 4. Vercel preview

```bash
npx vercel login
npx vercel link                                             # create / pick the project
npx vercel env add VITE_SUPABASE_URL preview                # paste the value when asked
npx vercel env add VITE_SUPABASE_PUBLISHABLE_KEY preview
npx vercel deploy                                           # prints the preview URL
```

`vercel.json` rewrites every path to `index.html`, so `/admin/*` survives a reload.

## 5. Production

- **URL:** https://duel-sand.vercel.app (game on `/`, admin on `/admin`). Production is public; previews stay behind Vercel auth.
- **Env vars:** `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are set for Production as well as Preview. Never add `SUPABASE_SECRET_KEY` to Vercel.
- **Deploy:** `npx vercel deploy --prod`.
- **Supabase Auth URLs:** the cloud project's Site URL is the production URL. Its redirect URLs are `<prod>/admin`, `http://localhost:5173/admin` and `http://127.0.0.1:5173/admin`. They were set by pushing a minimal config that declares only these two settings. **Do not `supabase config push` the repo's `config.toml`:** it holds local-only values (MFA, confirmations, pooler) that differ from the cloud. To change the URLs again, push a config that declares only `[auth] site_url` and `additional_redirect_urls`:
  ```bash
  mkdir -p /tmp/auth-urls/supabase && cat > /tmp/auth-urls/supabase/config.toml <<'TOML'
  project_id = "duel"
  [auth]
  site_url = "https://duel-sand.vercel.app"
  additional_redirect_urls = ["https://duel-sand.vercel.app/admin", "http://localhost:5173/admin", "http://127.0.0.1:5173/admin"]
  TOML
  npx supabase config diff --remote=<project-ref> --workdir /tmp/auth-urls   # only "update" lines should be these two
  npx supabase config push --remote=<project-ref> --workdir /tmp/auth-urls
  ```
- **Onboarding an editor:** run `npm run db:grant-admin -- --remote editor@example.com`. Then send them https://duel-sand.vercel.app/admin, where they request a magic link and open it in the same browser.

## Schema changes

- Every schema change is a migration in `supabase/migrations/`. Create one with `npx supabase migration new <name>`.
- Never change the schema in the dashboard.
- After a migration change, run:
  ```bash
  npm run db:reset && npm run db:types && npm run test:db
  ```
