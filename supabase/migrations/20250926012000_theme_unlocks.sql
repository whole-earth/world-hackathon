-- Theme unlocks table tracks how a user unlocked a theme

create table if not exists public.theme_unlocks (
  id uuid primary key default gen_random_uuid(),
  worldcoin_nullifier text not null,
  theme_slug text not null,
  method text not null check (method in ('payment','credits','mock')),
  payment_reference text,
  created_at timestamptz not null default now(),
  unique (worldcoin_nullifier, theme_slug)
);

alter table public.theme_unlocks
  add constraint theme_unlocks_nullifier_fk
  foreign key (worldcoin_nullifier)
  references public.profiles(worldcoin_nullifier)
  on delete restrict;

create index if not exists theme_unlocks_reference_idx on public.theme_unlocks (payment_reference);
create index if not exists theme_unlocks_theme_idx on public.theme_unlocks (theme_slug);

