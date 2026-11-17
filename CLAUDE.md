# Duel

Browser game for two players in the TV "duel" format. A photo from a category is shown, players answer in turns, and each has a chess-clock timer. The host shares this browser tab on a video call and judges answers with hotkeys. There is no realtime/multiplayer backend.

- Design (source of truth for UI): https://claude.ai/artifact/GKXno9183U6HMvp5GGtsqi
- Game rules and requirements: `openspec/specs/` (`game-engine`, `game-ui`, `admin`)
- Phases and progress: `docs/roadmap.md`

## Stack
- Vite + React 19 + TypeScript, `react-router-dom`
- Supabase: Postgres, Storage (bucket `photos`), Auth (single admin, magic link)
- Vitest + Testing Library, oxlint, Prettier
- Deploy: Vercel

## Commands
```bash
npm install
npm run dev        # local dev server
npm run build      # type-check + production build
npm test           # vitest
npm run lint       # oxlint
npm run format     # prettier
```

Env vars live in `.env.local` (see `.env.example`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

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

## Data model
- `categories`: id, name, hint, status (`draft` | `published`), cover_path, created_at, updated_at
- `photos`: id, category_id → categories, storage_path, answer_storage_path (nullable), answer, is_vertical, position, created_at
- RLS: anon `select` only on published categories and their photos; insert/update/delete only for the admin. Same rule for the `photos` bucket.

## Conventions
- UI copy is Ukrainian; code, identifiers, commits and OpenSpec artifacts are English.
- Screen-share constraints: 16:9 fixed stage, text contrast ≥ 4.5:1, never convey state with opacity alone, large type (Unbounded for display, Inter for body, JetBrains Mono for timers).
- Colours: background `#0B0D12`, surface `#151922`, player 1 `#F5A524`, player 2 `#3BC9F5`, correct `#30A46C`, wrong `#E5484D`, frozen text `#C4C9D2`.
- Host hotkeys (`→`/`Enter`, `X`, `P`, `Space`, `Esc`) are ignored while focus is in an input.
- Game-logic changes come with Vitest tests.
