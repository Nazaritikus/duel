-- Private bucket for photo files: `<category_id>/<photo_id>[.answer].<ext>`.
-- Reading mirrors the table rules (published categories, or an admin); writing is admin-only.
-- Players get signed URLs (phase 8); there are no permanent public URLs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos',
  'photos',
  false,
  5242880, -- 5 MB; uploads are compressed to ~1600 px WebP in the admin (phase 7)
  -- SVG only for the generated mock catalog; real uploads are WebP/JPEG/PNG/AVIF.
  array['image/webp', 'image/jpeg', 'image/png', 'image/avif', 'image/svg+xml']
)
on conflict (id) do nothing;

create policy "Photo files of published categories are readable; admins read all"
  on storage.objects for select
  to anon, authenticated
  using (
    bucket_id = 'photos'
    and (
      (select private.is_admin())
      or exists (
        select 1 from public.categories c
        where c.id::text = (storage.foldername(objects.name))[1]
          and c.status = 'published'
      )
    )
  );

-- Upsert needs insert + select + update; admins have all three.
create policy "Admins upload photo files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'photos' and (select private.is_admin()));

create policy "Admins update photo files"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'photos' and (select private.is_admin()))
  with check (bucket_id = 'photos' and (select private.is_admin()));

create policy "Admins delete photo files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'photos' and (select private.is_admin()));
