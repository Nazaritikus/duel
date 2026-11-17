-- Publish rule (spec: admin / Publish rule enforced by the database): a category may become
-- published only with at least 60 photos and no empty answers. Only the transition to
-- `published` is checked; editing an already published category is allowed and the admin UI
-- shows the problems as a warning.
--
-- Trusted roles (service_role via the secret key, postgres for maintenance) are exempt so the
-- seed script can publish the small mock categories. API clients run as `anon` or
-- `authenticated`, and the function is SECURITY INVOKER, so `current_user` is the caller.

create function public.enforce_publish_rule()
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

  if total < 60 or missing > 0 then
    raise exception 'category cannot be published: % photos, % without an answer', total, missing
      using errcode = 'check_violation', hint = 'publish_rule';
  end if;
  return new;
end;
$$;

create trigger categories_enforce_publish_rule
  before insert or update of status on public.categories
  for each row execute function public.enforce_publish_rule();

revoke execute on function public.enforce_publish_rule() from public, anon, authenticated;
