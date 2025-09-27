-- Track which inbox items each user has seen
-- This scales efficiently for 100+ users by using composite primary key
-- and proper indexing for fast lookups
create table if not exists public.user_inbox_views (
  worldcoin_nullifier text not null references public.profiles(worldcoin_nullifier) on delete cascade,
  inbox_item_id uuid not null references public.media_inbox(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (worldcoin_nullifier, inbox_item_id)
);

-- Index for fast user-specific queries (what has this user seen?)
create index if not exists user_inbox_views_user_idx on public.user_inbox_views (worldcoin_nullifier, viewed_at desc);

-- Index for fast item-specific queries (who has seen this item?)
create index if not exists user_inbox_views_item_idx on public.user_inbox_views (inbox_item_id);

-- Function to clean up views when inbox items are deleted
-- This is automatically handled by the CASCADE delete, but we can add a trigger
-- for additional cleanup if needed in the future
create or replace function public.cleanup_user_inbox_views()
returns trigger as $$
begin
  -- Delete all view records for the deleted inbox item
  delete from public.user_inbox_views 
  where inbox_item_id = old.id;
  
  return old;
end;
$$ language plpgsql;

-- Trigger to clean up views when inbox items are deleted
drop trigger if exists cleanup_inbox_views on public.media_inbox;
create trigger cleanup_inbox_views
after delete on public.media_inbox
for each row execute function public.cleanup_user_inbox_views();
