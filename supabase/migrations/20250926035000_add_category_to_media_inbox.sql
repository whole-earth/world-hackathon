-- Add category column to media_inbox table
-- No backfill - existing rows will have NULL category values

alter table public.media_inbox 
add column category text;

-- Add index for efficient category-based queries
create index if not exists media_inbox_category_idx on public.media_inbox (category);

-- Add comment for documentation
comment on column public.media_inbox.category is 'Category classification for the media item (e.g., image, video, document, etc.)';
