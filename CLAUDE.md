# Duel

Browser game for two players in the TV "duel" format. A photo from a category is shown, players answer in turns, and each has a chess-clock timer. The host shares this browser tab on a video call and judges answers with hotkeys. There is no realtime/multiplayer backend.

- Design (source of truth for UI): https://claude.ai/artifact/GKXno9183U6HMvp5GGtsqi — snapshot of every screen with tokens in `docs/design/` (read `docs/design/README.md` and the matching `docs/design/source/*.dc.html` before building a screen)
- Game rules and requirements: `openspec/specs/` (`game-engine`, `game-ui`, `admin`) — normative
- Original product docs (Ukrainian, background only): `docs/product/requirements.md`, `docs/product/implementation-phases.md`
- Phases and progress: `docs/roadmap.md`

## Stack
- Vite + React 19 + TypeScript, `react-router-dom`
- Supabase: Postgres, Storage (private bucket `photos`), Auth (admins on an allowlist, magic link)
- Vitest + Testing Library, oxlint, Prettier
- Deploy: Vercel (CLI, project `duel`): production https://duel-sand.vercel.app (`npx vercel deploy --prod`), previews behind Vercel auth. Never `supabase config push` the repo config to the cloud (see `docs/setup.md` §5)
- Supabase and Vercel CLIs are devDependencies: always `npx supabase …` / `npx vercel …`

## Commands
```bash
npm install
npm run dev        # local dev server
npm run build      # type-check + production build
npm test           # vitest
npm run lint       # oxlint
npm run format     # prettier

npm run db:start   # local Supabase stack (Docker)
npm run db:reset   # re-apply all migrations to the local DB
npm run db:types   # regenerate src/lib/database.types.ts from the local DB
npm run db:seed    # upload the mock catalog (add `-- --remote` for the cloud project)
npm run db:grant-admin -- [--remote] <email>
npm run test:db    # RLS / storage policy tests against the local stack
```

- Env vars live in `.env` / `.env.local`, see `.env.example`. Both files are git-ignored.
  - Browser: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
  - Scripts only: `SUPABASE_SECRET_KEY`. Never `VITE_`-prefix it.
- Local scripts and tests read the local stack's keys from `supabase status`.
- One-time owner setup: `docs/setup.md`.
- Supabase CLI v3 is local by default; cloud commands need `--remote` (e.g. `npx supabase db push --remote`).

## Spec-driven workflow (OpenSpec)
Every non-trivial change goes through OpenSpec. Do not change game rules in code without a spec change.

1. `/openspec-explore` — think an idea through (optional)
2. `/openspec-propose "<idea>"` — creates `openspec/changes/<name>/` with proposal, design, tasks and spec deltas
3. `/openspec-apply-change` — implement the tasks
4. `/openspec-archive-change` — merge the deltas into `openspec/specs/` once done

CLI: `npx @fission-ai/openspec list | validate | show`. Run `openspec validate --all` before archiving.

### Roadmap tracking
Work follows the phases in `docs/roadmap.md` (one phase = one OpenSpec change, named as in the roadmap).
- When proposing a phase's change, set its status to `▶` in the table.
- After `/openspec-archive-change`, set it to `✔ <date>`, fill the "Result" column and add a short summary (what was built, public API, spec changes) under that phase's details.
- If a phase's scope changes during work, update its bullets in the roadmap in the same commit.

## Architecture
```
src/
  game/          # pure game engine: reducer, state machine, timers, shuffle — no React, no Supabase
  features/
    play/        # setup, countdown, game, feedback, pause, result screens
    admin/       # login, categories list, category editor, upload
  lib/supabase.ts
  routes.tsx     # "/" game, "/admin/*" admin
supabase/migrations/
```
- `src/game` is framework-free and fully unit-tested. UI dispatches actions (`correct`, `wrong`, `pass`, `pause`, `tick(now)`) and renders state.
- Time is derived from `performance.now()` timestamps stored in state, never from counting ticks. Rendering uses `requestAnimationFrame`.
- The game reads categories through `CategorySource`: Supabase (published only, signed URLs, supabase-js lazy-loaded) by default, the mock catalog with `VITE_CATEGORY_SOURCE=mock` or when Supabase env is missing (unit tests blank it in `vite.config.ts`). Photos are decoded ahead with `createImagePreloader`.

## Data model
- `categories`: id, name, hint, status (`draft` | `published`), cover_path, created_at, updated_at
- `photos`: id, category_id → categories (cascade), storage_path, answer_storage_path (nullable), answer (default ''), is_vertical, position (unique per category, deferrable), created_at
- `admins`: user_id → auth.users. This is the allowlist; rows are written only with the secret key (`db:grant-admin`). `private.is_admin()` (security definer, non-exposed schema) is used by policies.
- RLS:
  - `anon` and non-admins `select` only published categories and their photos;
  - insert / update / delete only for admins;
  - the private `photos` bucket mirrors this per folder.
- Storage paths: `<category_id>/<photo_id>.<ext>`, answer photo `<category_id>/<photo_id>.answer.<ext>`. Players get signed URLs.
- `categories.updated_at` also moves when any of its photos changes (trigger).
- Publish rule: a trigger refuses `status = 'published'` for API roles unless the category has ≥ 60 photos and no empty answers (the service role is exempt, so the seed works). The admin UI shows the same reasons (`getPublishProblems`).
- Admin login: magic link (PKCE), only for users already on the allowlist; local emails land in Mailpit (http://127.0.0.1:54324).
- Schema changes:
  1. Only through migrations: `npx supabase migration new <name>`.
  2. Then `db:reset`, `db:types`, `test:db`.
  3. Then `npx supabase db push --remote`.

## Conventions
- UI copy is Ukrainian; code, identifiers, commits and OpenSpec artifacts are English.
- Screen-share constraints: 16:9 fixed stage, text contrast ≥ 4.5:1, never convey state with opacity alone, large type (Unbounded for display, Inter for body, JetBrains Mono for timers).
- Colours: background `#0B0D12`, surface `#151922`, player 1 `#F5A524`, player 2 `#3BC9F5`, correct `#30A46C`, wrong `#E5484D`, frozen text `#C4C9D2`.
- Host hotkeys (`→`/`Enter`, `X`, `P`, `Space`, `Esc`) are ignored while focus is in an input.
- Game-logic changes come with Vitest tests.
