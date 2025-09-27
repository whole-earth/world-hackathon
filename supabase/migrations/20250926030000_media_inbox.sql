-- Media inbox for uploads before they become posts
create table if not exists public.media_inbox (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  color text not null,
  description text,
  uploaded_by text not null references public.profiles(worldcoin_nullifier) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists media_inbox_uploaded_by_idx on public.media_inbox (uploaded_by);
create index if not exists media_inbox_created_at_idx on public.media_inbox (created_at desc);
