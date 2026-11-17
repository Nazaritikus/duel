# Proposal

## Why

Phase 5 put the schema, RLS and private storage in place, but nobody can change content without the secret key. A content editor has to create and publish categories from a browser. This phase adds the admin login and category management, so phase 7 can add photo upload on top.

## What Changes

**Admin login (`/admin/login`):**
- an email field sends a Supabase Auth magic link that redirects back to `/admin`;
- links are sent only to existing Auth users (admins are created with `db:grant-admin`), so nobody can create an account by asking for a link;
- the confirmation copy is the same whether or not the address is known, so it does not reveal who has access.

**Admin guard:**
- every `/admin/*` page other than login requires a session; without one the browser goes to `/admin/login`;
- a signed-in user who is not on the allowlist sees "Немає доступу" with a logout button and no admin data;
- the admin shell (sidebar: «Категорії», «Відкрити гру →», current email, «Вийти») wraps every admin page.

**Categories list (`/admin`):**
- a table per the `AdminCategories` artboard: cover placeholder, name, photo count (red below 60), status badge («Опубліковано» / «Чернетка»), last update («сьогодні» or a short date), «Редагувати»;
- search by name, «Нова категорія».

**Category editor (`/admin/categories/new`, `/admin/categories/:id`):**
- name (1–60 chars) and player hint;
- «Зберегти», «Опублікувати» / «Зняти з публікації», «Видалити категорію» with an in-page confirmation (removes its storage files, then the row; photo rows cascade);
- a summary line «N фото · M без відповіді · K вертикальне»;
- when the category cannot be published, the publish button is disabled and the reasons are listed («Потрібно щонайменше 60 фото, зараз 12», «3 фото без відповіді»);
- the photo grid itself comes in phase 7; until then the editor shows an empty-state note.

**Publish validation in the database:** a trigger refuses to set `status = 'published'` (insert or update) for a category with fewer than 60 photos or any photo with an empty answer, unless the write comes from the service role. That keeps `npm run db:seed` (3 mock categories of 8–12 photos) working, while the UI and the API enforce the same rule for admins.

**Game rules:** no change.

**Out of scope:**
- Photo upload, the photo grid, editing answers and answer photos (phase 7).
- Production deploy (phase 7).
- The game reading Supabase categories (phase 8).
- The «Налаштування» sidebar item from the artboard: there are no admin settings yet, so it is not shown.
- Category covers: `cover_path` stays unused; the list shows the artboard's placeholder until phase 7 can pick a photo.
- Auto-unpublishing a published category that later drops below the rule; the list and editor show the problem instead (see design).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- **`admin`:**
  - "Admin authentication": the magic link is sent only to existing users, the copy does not reveal access, and non-admins see a no-access page;
  - "Category management": list search, the editor fields, delete with confirmation, and publish validation enforced by the database as well as the UI, with the reasons listed.

## Impact

- **New:** `src/features/admin/*` (API layer over Supabase, auth session hook, guard, shell, login, list, editor, publish rules), a migration with the publish trigger, DB tests for it.
- **Changed:** `src/routes.tsx` (lazy-loaded admin routes replace the stub), `src/pages.tsx` (stub removed), `src/lib/supabase.ts` (PKCE auth flow), `src/lib/database.types.ts` (regenerated), `docs/setup.md` (admin login).
- **Cloud:** the migration is pushed to the hosted project.
- **Dependencies:** none new.
