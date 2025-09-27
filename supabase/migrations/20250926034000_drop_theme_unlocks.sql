-- Drop the old theme_unlocks table after successful migration to channel_unlocks
-- This removes the unused table and its associated indexes

-- Drop indexes first
drop index if exists public.theme_unlocks_reference_idx;
drop index if exists public.theme_unlocks_theme_idx;

-- Drop the table
drop table if exists public.theme_unlocks;

-- Verify the table is gone
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'theme_unlocks' AND table_schema = 'public')
    THEN 'theme_unlocks still exists'
    ELSE 'theme_unlocks successfully dropped'
  END as status;
