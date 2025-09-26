-- Profiles table for Worldcoin-linked users
-- Run this SQL in your Supabase project's SQL editor or migration runner.

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  worldcoin_nullifier text not null unique,
  username text not null unique,
  world_app_address text, -- optional: user-provided payout address
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_worldcoin_nullifier_idx on public.profiles (worldcoin_nullifier);
create index if not exists profiles_username_idx on public.profiles (username);

-- Trigger to maintain updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

