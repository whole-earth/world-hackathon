-- Core domain schema using Worldcoin identities
-- Terminology: themes → channels, items → posts

-- Channels catalog (instead of enum, easier to evolve)
create table if not exists public.channels (
  slug text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

-- Seed a few starter channels (idempotent)
insert into public.channels (slug, name)
values
  ('environment', 'Environment'),
  ('shelter', 'Shelter'),
  ('tools', 'Tools'),
  ('education', 'Education'),
  ('cryptography', 'Cryptography')
on conflict (slug) do nothing;

-- Post status check (use text + check for portability)
-- submitted | catalog | rejected
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'submitted' check (status in ('submitted','catalog','rejected')),
  channel_slug text not null references public.channels(slug) on delete restrict,
  title text not null,
  thumbnail_url text,
  source_url text,
  submitted_by text not null references public.profiles(worldcoin_nullifier) on delete restrict,
  yay_count integer not null default 0,
  nay_count integer not null default 0,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create index if not exists posts_channel_status_created_idx on public.posts (channel_slug, status, created_at desc);
create index if not exists posts_submitted_by_idx on public.posts (submitted_by);

-- Votes: one per user per post
create table if not exists public.votes (
  post_id uuid not null references public.posts(id) on delete cascade,
  voter_nullifier text not null references public.profiles(worldcoin_nullifier) on delete cascade,
  is_yay boolean not null,
  created_at timestamptz not null default now(),
  primary key (post_id, voter_nullifier)
);

create index if not exists votes_voter_idx on public.votes (voter_nullifier, created_at desc);

-- Credits per user
create table if not exists public.user_credits (
  worldcoin_nullifier text primary key references public.profiles(worldcoin_nullifier) on delete cascade,
  credits integer not null default 0,
  updated_at timestamptz not null default now()
);

-- Update trigger for user_credits
create or replace function public.set_user_credits_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_user_credits_updated_at on public.user_credits;
create trigger set_user_credits_updated_at
before update on public.user_credits
for each row execute function public.set_user_credits_updated_at();

-- Channel unlocks (formerly themes)
create table if not exists public.channel_unlocks (
  worldcoin_nullifier text not null references public.profiles(worldcoin_nullifier) on delete cascade,
  channel_slug text not null references public.channels(slug) on delete cascade,
  unlocked_via text not null check (unlocked_via in ('credits','payment')),
  created_at timestamptz not null default now(),
  primary key (worldcoin_nullifier, channel_slug)
);

-- Payments related to unlocks or credits
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  worldcoin_nullifier text not null references public.profiles(worldcoin_nullifier) on delete cascade,
  provider text not null default 'world',
  provider_tx_id text unique,
  amount_worldcoins numeric,
  purpose text not null check (purpose in ('unlock_channel','credits_topup')),
  created_at timestamptz not null default now()
);

