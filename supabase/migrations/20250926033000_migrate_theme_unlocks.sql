-- Migrate theme_unlocks data to channel_unlocks
-- Map old theme slugs to new channel slugs

-- Insert theme unlocks into channel_unlocks
-- Map 'crypto' theme to 'cryptography' channel
INSERT INTO public.channel_unlocks (worldcoin_nullifier, channel_slug, unlocked_via, created_at)
SELECT 
  worldcoin_nullifier,
  CASE 
    WHEN theme_slug = 'crypto' THEN 'cryptography'
    ELSE theme_slug
  END as channel_slug,
  CASE 
    WHEN method = 'payment' THEN 'payment'
    WHEN method = 'credits' THEN 'credits'
    WHEN method = 'mock' THEN 'credits' -- Map mock to credits for consistency
    ELSE 'credits'
  END as unlocked_via,
  created_at
FROM public.theme_unlocks
WHERE theme_slug IN ('education', 'crypto') -- Only migrate valid themes
ON CONFLICT (worldcoin_nullifier, channel_slug) DO NOTHING;

-- Verify the migration
SELECT 
  'theme_unlocks' as source_table,
  COUNT(*) as count
FROM public.theme_unlocks
UNION ALL
SELECT 
  'channel_unlocks' as target_table,
  COUNT(*) as count
FROM public.channel_unlocks;
