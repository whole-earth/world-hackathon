-- Add world_username to profiles for pulling usernames from World App

alter table if exists public.profiles
  add column if not exists world_username text;

-- Ensure uniqueness if possible; adjust if your app needs non-unique
do $$
begin
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'profiles_world_username_key'
  ) then
    alter table public.profiles
      add constraint profiles_world_username_key unique (world_username);
  end if;
end $$;

create index if not exists profiles_world_username_idx on public.profiles (world_username);

