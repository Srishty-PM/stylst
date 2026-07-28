-- Settings page persistence: currency + notification preferences on profiles.
alter table public.profiles
  add column if not exists currency text not null default 'gbp',
  add column if not exists email_notifications boolean not null default true,
  add column if not exists push_notifications boolean not null default false;
