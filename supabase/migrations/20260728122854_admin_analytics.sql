-- Owner/admin concept so the analytics dashboard is readable only by the app owner.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
-- No client policies on purpose: only SECURITY DEFINER functions / service_role touch this table.

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- DEPLOY STEP (seed the owner — analytics is invisible to everyone until this runs):
--   insert into public.admin_users (user_id)
--   select id from auth.users where email = '<owner account email>'
--   on conflict (user_id) do nothing;
