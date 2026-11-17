-- `updated_at` bookkeeping. A category's last update also moves when any of its photos is
-- created, changed or deleted (spec: admin / Data integrity).

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

create function public.touch_category()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update public.categories set updated_at = now() where id = old.category_id;
  end if;
  if tg_op = 'INSERT' or (tg_op = 'UPDATE' and new.category_id is distinct from old.category_id) then
    update public.categories set updated_at = now() where id = new.category_id;
  end if;
  return null;
end;
$$;

create trigger photos_touch_category
  after insert or update or delete on public.photos
  for each row execute function public.touch_category();

-- Trigger functions are not meant to be called directly through the API.
revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.touch_category() from public, anon, authenticated;
