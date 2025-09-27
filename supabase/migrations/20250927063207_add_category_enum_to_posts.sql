-- Add category enum to posts table
-- Categories: env, tools, shelter, education, crypto

-- Create the enum type
create type post_category as enum ('env', 'tools', 'shelter', 'education', 'crypto');

-- Add category column to posts table
alter table public.posts 
add column category post_category;

-- Add index for efficient category-based queries
create index if not exists posts_category_idx on public.posts (category);

-- Add comment for documentation
comment on column public.posts.category is 'Category classification for the post (env, tools, shelter, education, crypto)';
