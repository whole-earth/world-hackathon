-- Add URL, thumbnail, and uploader username to media_inbox
alter table public.media_inbox
  add column if not exists source_url text,
  add column if not exists thumbnail_url text,
  add column if not exists uploaded_by_username text;

-- Optional: simple index to filter by source URL
create index if not exists media_inbox_source_url_idx on public.media_inbox (source_url);

-- Create a public storage bucket for thumbnails if it doesn't exist
insert into storage.buckets (id, name, public)
values ('media-thumbnails', 'media-thumbnails', true)
on conflict (id) do nothing;

