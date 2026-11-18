-- Admin and storage hardening (change: polish-admin-and-storage).

-- 1. Photo paths must live in their own category's folder (spec: admin / Content storage
--    layout). Added NOT VALID, then validated, so existing rows are checked without a long lock.
alter table public.photos
  add constraint photos_storage_path_in_category check (
    storage_path like category_id::text || '/%'
    and (answer_storage_path is null or answer_storage_path like category_id::text || '/%')
  ) not valid;

alter table public.photos validate constraint photos_storage_path_in_category;

-- 2. touch_category once per statement: a bulk photo write bumps each category once
--    (spec: admin / Data integrity). Transition tables need one trigger per event.
drop trigger photos_touch_category on public.photos;
drop function public.touch_category();

create function public.touch_category()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.categories c set updated_at = now()
      where c.id in (select distinct n.category_id from new_rows n);
  elsif tg_op = 'DELETE' then
    update public.categories c set updated_at = now()
      where c.id in (select distinct o.category_id from old_rows o);
  else
    -- Moving a photo between categories touches both.
    update public.categories c set updated_at = now()
      where c.id in (
        select n.category_id from new_rows n
        union
        select o.category_id from old_rows o
      );
  end if;
  return null;
end;
$$;

create trigger photos_touch_category_insert
  after insert on public.photos
  referencing new table as new_rows
  for each statement execute function public.touch_category();

create trigger photos_touch_category_update
  after update on public.photos
  referencing old table as old_rows new table as new_rows
  for each statement execute function public.touch_category();

create trigger photos_touch_category_delete
  after delete on public.photos
  referencing old table as old_rows
  for each statement execute function public.touch_category();

revoke execute on function public.touch_category() from public, anon, authenticated;

-- 3. A two-value enum on a few dozen rows: the index is never used.
drop index if exists public.categories_status_idx;

-- 4. Admin clients upload raster images only. SVG stays in the bucket allowlist for the
--    seed, which uses the secret key and bypasses RLS. The mimetype check catches an SVG
--    sent under a raster extension.
drop policy "Admins upload photo files" on storage.objects;
drop policy "Admins update photo files" on storage.objects;

create policy "Admins upload raster photo files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'photos'
    and (select private.is_admin())
    and lower(storage.extension(name)) in ('webp', 'jpg', 'jpeg', 'png', 'avif')
    and coalesce(metadata ->> 'mimetype', '') <> 'image/svg+xml'
  );

create policy "Admins update raster photo files"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'photos' and (select private.is_admin()))
  with check (
    bucket_id = 'photos'
    and (select private.is_admin())
    and lower(storage.extension(name)) in ('webp', 'jpg', 'jpeg', 'png', 'avif')
    and coalesce(metadata ->> 'mimetype', '') <> 'image/svg+xml'
  );
