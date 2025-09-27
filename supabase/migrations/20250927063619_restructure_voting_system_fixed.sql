-- Restructure voting system: media_inbox for voting, posts for approved content
-- Remove channel_slug and vote counts from posts, add voting to media_inbox

-- First, update media_inbox to use the same category enum as posts
alter table public.media_inbox 
alter column category type post_category using category::post_category;

-- Add voting fields to media_inbox
alter table public.media_inbox 
add column upvotes integer not null default 0,
add column downvotes integer not null default 0;

-- Add indexes for efficient voting queries
create index if not exists media_inbox_votes_idx on public.media_inbox (upvotes desc, created_at desc);

-- Create votes table for media_inbox items (separate from posts votes)
create table if not exists public.media_inbox_votes (
  inbox_item_id uuid not null references public.media_inbox(id) on delete cascade,
  voter_nullifier text not null references public.profiles(worldcoin_nullifier) on delete cascade,
  is_upvote boolean not null,
  created_at timestamptz not null default now(),
  primary key (inbox_item_id, voter_nullifier)
);

create index if not exists media_inbox_votes_voter_idx on public.media_inbox_votes (voter_nullifier, created_at desc);

-- Function to update vote counts when votes are added/changed
create or replace function public.update_media_inbox_vote_counts()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    if new.is_upvote then
      update public.media_inbox set upvotes = upvotes + 1 where id = new.inbox_item_id;
    else
      update public.media_inbox set downvotes = downvotes + 1 where id = new.inbox_item_id;
    end if;
    return new;
  elsif TG_OP = 'UPDATE' then
    -- Handle vote change (upvote to downvote or vice versa)
    if old.is_upvote != new.is_upvote then
      if old.is_upvote then
        -- Was upvote, now downvote
        update public.media_inbox set upvotes = upvotes - 1, downvotes = downvotes + 1 where id = new.inbox_item_id;
      else
        -- Was downvote, now upvote
        update public.media_inbox set upvotes = upvotes + 1, downvotes = downvotes - 1 where id = new.inbox_item_id;
      end if;
    end if;
    return new;
  elsif TG_OP = 'DELETE' then
    if old.is_upvote then
      update public.media_inbox set upvotes = upvotes - 1 where id = old.inbox_item_id;
    else
      update public.media_inbox set downvotes = downvotes - 1 where id = old.inbox_item_id;
    end if;
    return old;
  end if;
  return null;
end;
$$ language plpgsql;

-- Create trigger for vote count updates
drop trigger if exists update_media_inbox_vote_counts_trigger on public.media_inbox_votes;
create trigger update_media_inbox_vote_counts_trigger
after insert or update or delete on public.media_inbox_votes
for each row execute function public.update_media_inbox_vote_counts();

-- Function to promote items from inbox to posts when they reach 10+ upvotes
create or replace function public.promote_approved_items()
returns void as $$
declare
  item record;
begin
  -- Find items with 10+ upvotes that haven't been promoted yet
  for item in 
    select * from public.media_inbox 
    where upvotes >= 10 
    and not exists (
      select 1 from public.posts p 
      where p.title = item.title 
      and p.submitted_by = item.uploaded_by
      and p.created_at >= item.created_at - interval '1 minute'
    )
  loop
    -- Insert into posts table
    insert into public.posts (
      status,
      title,
      thumbnail_url,
      source_url,
      submitted_by,
      category,
      created_at,
      accepted_at
    ) values (
      'catalog',
      item.title,
      null, -- thumbnail_url can be added later if needed
      null, -- source_url can be added later if needed
      item.uploaded_by,
      item.category,
      item.created_at,
      now()
    );
    
    -- Optionally delete from inbox (or mark as promoted)
    -- For now, we'll keep it in inbox but could add a 'promoted' flag
  end loop;
end;
$$ language plpgsql;

-- Remove channel_slug and vote counts from posts table
alter table public.posts 
drop column if exists channel_slug,
drop column if exists yay_count,
drop column if exists nay_count;

-- Remove the old votes table since we're using media_inbox_votes now
drop table if exists public.votes;

-- Add comment explaining the new workflow
comment on table public.media_inbox is 'Items being voted on before promotion to posts table';
comment on table public.posts is 'Approved items that received 10+ upvotes in media_inbox';
comment on table public.media_inbox_votes is 'Votes on items in media_inbox (one vote per user per item)';
