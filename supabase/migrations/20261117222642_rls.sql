-- Row-level security: everyone reads published content; only admins read drafts and write.
-- One policy per command keeps each rule explicit (see design.md §5).

-- categories ---------------------------------------------------------------

create policy "Published categories are readable; admins read all"
  on public.categories for select
  to anon, authenticated
  using (status = 'published' or (select private.is_admin()));

create policy "Admins insert categories"
  on public.categories for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "Admins update categories"
  on public.categories for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "Admins delete categories"
  on public.categories for delete
  to authenticated
  using ((select private.is_admin()));

-- photos -------------------------------------------------------------------

create policy "Photos of published categories are readable; admins read all"
  on public.photos for select
  to anon, authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1 from public.categories c
      where c.id = photos.category_id and c.status = 'published'
    )
  );

create policy "Admins insert photos"
  on public.photos for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "Admins update photos"
  on public.photos for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "Admins delete photos"
  on public.photos for delete
  to authenticated
  using ((select private.is_admin()));
