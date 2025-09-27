-- Additional optimizations for scaling to 100+ users
-- This migration adds performance optimizations and cleanup strategies

-- Add partial indexes for common query patterns
-- Only index non-null values for better performance
-- Note: We'll create a regular index instead of partial since now() is not immutable
create index if not exists media_inbox_created_at_idx on public.media_inbox (created_at desc);

-- Add index for user-specific inbox queries (what items has this user NOT seen?)
-- Note: Using regular index since now() is not immutable for partial indexes
create index if not exists user_inbox_views_recent_idx on public.user_inbox_views (worldcoin_nullifier, viewed_at desc);

-- Add a materialized view for fast "unseen items" queries
-- This pre-computes which items each user hasn't seen yet
create materialized view if not exists public.user_unseen_inbox as
select 
  p.worldcoin_nullifier,
  mi.id as inbox_item_id,
  mi.title,
  mi.subtitle,
  mi.color,
  mi.description,
  mi.created_at
from public.profiles p
cross join public.media_inbox mi
left join public.user_inbox_views uiv on (
  uiv.worldcoin_nullifier = p.worldcoin_nullifier 
  and uiv.inbox_item_id = mi.id
)
where uiv.inbox_item_id is null;

-- Index for the materialized view
create index if not exists user_unseen_inbox_user_idx on public.user_unseen_inbox (worldcoin_nullifier, created_at desc);

-- Function to refresh the materialized view
create or replace function public.refresh_user_unseen_inbox()
returns void as $$
begin
  refresh materialized view public.user_unseen_inbox;
end;
$$ language plpgsql;

-- Function to clean up old view records (older than 30 days)
-- This prevents the user_inbox_views table from growing indefinitely
create or replace function public.cleanup_old_inbox_views()
returns void as $$
declare
  cutoff_date timestamptz;
begin
  cutoff_date := now() - interval '30 days';
  
  delete from public.user_inbox_views 
  where viewed_at < cutoff_date;
  
  -- Also clean up old inbox items that are no longer relevant
  delete from public.media_inbox 
  where created_at < cutoff_date;
end;
$$ language plpgsql;

-- Add a scheduled cleanup (this would typically be set up as a cron job)
-- For now, we'll create a function that can be called manually or via triggers
create or replace function public.auto_cleanup_inbox()
returns trigger as $$
begin
  -- Clean up old views when new ones are added (batch cleanup)
  if random() < 0.01 then -- 1% chance to trigger cleanup
    perform public.cleanup_old_inbox_views();
  end if;
  
  return new;
end;
$$ language plpgsql;

-- Trigger to occasionally clean up old data
drop trigger if exists auto_cleanup_trigger on public.user_inbox_views;
create trigger auto_cleanup_trigger
after insert on public.user_inbox_views
for each row execute function public.auto_cleanup_inbox();
