-- Publish minimum lowered from 60 to 50 photos (change: lower-publish-minimum).
-- Same rule otherwise: only the transition to `published` is checked, API roles only.

create or replace function public.enforce_publish_rule()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  total integer;
  missing integer;
begin
  if new.status <> 'published' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'published' then
    return new;
  end if;
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  select count(*), count(*) filter (where btrim(p.answer) = '')
    into total, missing
    from public.photos p
    where p.category_id = new.id;

  if total < 50 or missing > 0 then
    raise exception 'category cannot be published: % photos, % without an answer', total, missing
      using errcode = 'check_violation', hint = 'publish_rule';
  end if;
  return new;
end;
$$;

revoke execute on function public.enforce_publish_rule() from public, anon, authenticated;
