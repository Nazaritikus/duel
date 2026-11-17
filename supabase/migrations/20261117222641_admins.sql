-- Admins are an allowlist of auth users (one or more). Rows are added only with the secret
-- key (scripts/grant-admin.mjs); nobody can add themselves through the API.

create table public.admins (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

comment on table public.admins is 'Allowlist of admin users; written only by the service role.';

alter table public.admins enable row level security;

grant select on public.admins to authenticated;

create policy "Users can see their own admin row"
  on public.admins for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- `is_admin()` must read `admins` regardless of the caller's RLS, so it is SECURITY DEFINER.
-- It lives in the non-exposed `private` schema (not callable through the Data API), returns
-- only a boolean about the caller themselves, and pins an empty search_path.
create schema if not exists private;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins where user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_admin() from public;
-- Policies run as the calling role, so it needs to reach the function.
grant usage on schema private to anon, authenticated;
grant execute on function private.is_admin() to anon, authenticated;
