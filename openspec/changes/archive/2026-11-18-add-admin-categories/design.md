# Design

## Context

- `/admin/*` renders `AdminStub` (`src/pages.tsx`).
- `getSupabase()` (`src/lib/supabase.ts`) is a lazy typed client using the publishable key; nothing in the UI calls it yet.
- The DB has `categories`, `photos`, `admins` with RLS; `private.is_admin()` decides writes; `admins` lets a user read only their own row.
- `supabase/config.toml` already has `site_url = http://localhost:5173` and `/admin` redirect URLs; local emails land in Mailpit (`http://127.0.0.1:54324`).
- The seed script writes published categories with 8–12 photos using the secret key.
- Artboards: `AdminCategories.dc.html` (list) and `AdminCategoryEdit.dc.html` (editor; the photo grid belongs to phase 7). Admin screens are 1440×900, not the fixed game stage.

## Goals / Non-Goals

**Goals:**
- An admin can sign in with a magic link and manage categories from any browser.
- The publish rule holds even for a client that bypasses the UI.
- Admin code is testable without Supabase and is not part of the game bundle.

**Non-Goals:** photo upload and editing (phase 7), production deploy (phase 7), game data from Supabase (phase 8).

## Decisions

### 1. `AdminApi` seam
`src/features/admin/adminApi.ts` defines an `AdminApi` interface (auth: `getSession`, `onAuthChange`, `requestMagicLink`, `signOut`, `isAdmin`; data: `listCategories`, `getCategory`, `createCategory`, `updateCategory`, `setStatus`, `deleteCategory`) and `createSupabaseAdminApi(client)`. Components get it from `AdminApiContext`. Tests pass a fake, the same way the game uses `CategorySource`.

`listCategories` selects `id, name, status, updated_at, photos(answer, is_vertical)` and derives counts in the client (≤ a few dozen categories × ~100 photos; fine). `getCategory` returns the row plus the same derived stats.

### 2. Auth flow
- `createClient(..., { auth: { flowType: 'pkce' } })`: the link comes back as `/admin?code=…`; supabase-js exchanges it on load (`detectSessionInUrl`). PKCE keeps tokens out of the URL fragment.
- `requestMagicLink(email)` calls `signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: origin + '/admin' } })`. With `shouldCreateUser: false` an unknown email returns an error (`otp_disabled` / signups not allowed); the API maps that to success so the page shows the same confirmation. Rate-limit and network errors are shown.
- `useAdminSession()` tracks `{ status: 'loading' | 'signed-out' | 'signed-in', session, isAdmin }` from `getSession()` + `onAuthStateChange`; `isAdmin` reads the caller's own `admins` row (`select user_id … maybeSingle()`).
- `RequireAdmin` renders: loading → a spinner text; signed-out → `<Navigate to="/admin/login">`; signed-in non-admin → no-access page with «Вийти»; admin → the shell + outlet.

### 3. Routing and bundle
`/admin/*` becomes a `React.lazy` `AdminApp` with nested routes: `login`, `` (list), `categories/new`, `categories/:id`. `AdminApp` builds the API from `getSupabase()` once; if env vars are missing it shows «Supabase не налаштовано» instead of crashing. Lazy loading keeps supabase-js and the admin out of the game's initial chunk.

### 4. Publish rule (shared)
`src/features/admin/publishRules.ts`: `MIN_PHOTOS = 60`, `getPublishProblems({ photoCount, missingAnswers })` → Ukrainian reason strings (with `pluralUk`). Used by the list (red count) and the editor (reasons, disabled button, warning for a published category).

### 5. Publish trigger
Migration `…_publish_rule.sql`:
```sql
create function public.enforce_publish_rule() returns trigger
language plpgsql set search_path = '' as $$
declare total int; missing int;
begin
  if new.status <> 'published' then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'published' then return new; end if;
  if current_user not in ('anon', 'authenticated') then return new; end if;
  select count(*), count(*) filter (where btrim(answer) = '')
    into total, missing from public.photos where category_id = new.id;
  if total < 60 or missing > 0 then
    raise exception 'category % cannot be published: % photos, % without an answer', new.id, total, missing
      using errcode = 'check_violation', hint = 'publish_rule';
  end if;
  return new;
end $$;
create trigger categories_enforce_publish_rule before insert or update of status on public.categories
  for each row execute function public.enforce_publish_rule();
```
- **Only the transition is checked.** Editing a published category (renaming, or deleting photos in phase 7) is not blocked; the UI shows the reasons as a warning. Blocking photo deletes on a published category would make fixing content awkward, and auto-unpublishing would surprise players mid-session. *Alternative:* a constraint trigger on `photos` too — rejected for the reasons above.
- **Trusted-role exemption** keeps the seed working with small mock categories: the check runs only when `current_user` is `anon` or `authenticated` (API clients). `service_role` (secret key) and `postgres` (maintenance) are exempt.
- Security invoker: an admin can read all photos through RLS, so the count is correct. The function is not executable through the API (`revoke execute`).

### 6. Delete
`deleteCategory(id)` lists the storage folder `<id>/` (paged by 1000), removes the files, then deletes the row (photo rows cascade). Files first: if the row delete failed after files were gone the admin can retry; the reverse would orphan files with no UI to find them.

### 7. UI
- Admin CSS in `src/features/admin/admin.css` using the existing tokens; layout per the artboards (240 px sidebar, 1440 wide design but fluid with `min-width: 0`). Admin pages scroll normally; they are not on the 16:9 stage.
- Status badges carry text and colour (not opacity).
- Dates: «сьогодні» for today, else `Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short' })` («12 лист.»), plus the year when not the current year.
- The editor's «Зберегти» replaces the artboard's «Зберегти чернетку», because it also saves a published category.

### Decisions made autonomously
The owner authorized this phase to run without questions. Choices made without approval:
1. **No account creation via the login form** (`shouldCreateUser: false`) and a neutral confirmation for unknown emails — the allowlist is managed by `db:grant-admin`.
2. **DB enforces the publish transition only**, with a service-role exemption for the seed (§5). Published categories that later break the rule show a warning, not an automatic unpublish.
3. **Delete category** added to the editor (with in-page confirmation) though the roadmap bullet lists only create/edit/publish; the spec's cascade-delete requirement and a content editor's needs make it worth having now.
4. **«Налаштування» sidebar item dropped** (no settings exist); **cover column shows the placeholder** until photos exist (phase 7).
5. **PKCE flow** for the magic link.
6. **Admin routes lazy-loaded** to keep the game bundle lean.
7. **Button copy «Зберегти»** instead of «Зберегти чернетку» (§7).

## Risks / Trade-offs

- **PKCE needs the same browser** that requested the link. → The login page says to open the link on this device; a failed exchange lands on the login page with an error message.
- **Hosted email rate limits** (the default Supabase SMTP sends only a few emails per hour). → Shown as an error message; custom SMTP is an owner follow-up if it becomes a problem.
- **Client-derived counts** load every photo's answer for the list. → Small data; a view or RPC can replace it later.

## Migration Plan

1. `npx supabase migration new publish_rule`, `db:reset`, `db:types`, `test:db`.
2. `npx supabase db push --remote --yes`, then `npx supabase db advisors --remote`.
3. Rollback: a forward migration that drops the trigger and function.
