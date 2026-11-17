-- Categories and photos. RLS is enabled here, in the same migration that creates the tables,
-- so no table is ever reachable through the Data API without row-level security.
-- Policies come in the `rls` migration; until then the tables are closed to everyone but
-- the service role.

create type public.category_status as enum ('draft', 'published');

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  hint        text,
  status      public.category_status not null default 'draft',
  cover_path  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.categories is 'Photo categories; only published ones are visible to players.';

create index categories_status_idx on public.categories (status);

create table public.photos (
  id                   uuid primary key default gen_random_uuid(),
  category_id          uuid not null references public.categories (id) on delete cascade,
  storage_path         text not null unique,
  answer_storage_path  text unique,
  answer               text not null default '',
  is_vertical          boolean not null default false,
  position             integer not null check (position >= 0),
  created_at           timestamptz not null default now(),
  -- Also the index for "photos of a category in order". Deferrable so a reorder can swap
  -- positions inside one transaction.
  constraint photos_category_position_key unique (category_id, position)
    deferrable initially deferred
);

comment on table public.photos is 'Photos of a category; files live in the private storage bucket "photos".';

alter table public.categories enable row level security;
alter table public.photos enable row level security;

-- New tables are not exposed to the Data API automatically: grant explicitly. RLS decides
-- which rows each role may actually read or change.
grant select on public.categories, public.photos to anon, authenticated;
grant insert, update, delete on public.categories, public.photos to authenticated;
