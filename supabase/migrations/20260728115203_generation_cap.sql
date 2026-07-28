-- 50-generation lifetime cap (1 generation = 1 outfit-suggestion / auto-match request).
alter table public.profiles
  add column if not exists generation_count integer not null default 0;

-- Clients may update their own profile (name/currency/notifications) but must NOT be able
-- to reset generation_count. Only SECURITY DEFINER RPCs (running as the owner role) may change it.
create or replace function public.protect_profile_generation_count()
returns trigger
language plpgsql
as $$
begin
  if new.generation_count is distinct from old.generation_count and current_user = 'authenticated' then
    raise exception 'generation_count is read-only';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_generation_count on public.profiles;
create trigger trg_protect_generation_count
  before update on public.profiles
  for each row execute function public.protect_profile_generation_count();

-- Atomic check-and-increment. Returns the new count, or -1 if the limit is already reached.
create or replace function public.consume_generation(p_limit integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  cur integer;
begin
  select generation_count into cur from public.profiles where id = auth.uid() for update;
  if cur is null then
    return -1;
  end if;
  if cur >= p_limit then
    return -1;
  end if;
  update public.profiles set generation_count = generation_count + 1 where id = auth.uid();
  return cur + 1;
end;
$$;

-- Give a generation back when the AI request itself fails (e.g. model overload).
create or replace function public.refund_generation()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set generation_count = greatest(generation_count - 1, 0) where id = auth.uid();
end;
$$;

grant execute on function public.consume_generation(integer) to authenticated;
grant execute on function public.refund_generation() to authenticated;
