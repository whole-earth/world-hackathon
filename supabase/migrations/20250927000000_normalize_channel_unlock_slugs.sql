-- Normalize legacy theme slugs in channel_unlocks to canonical channel slugs
-- Safe against duplicates: only updates when a canonical row does not already exist for the same nullifier,
-- then removes any remaining legacy rows.

begin;

-- env -> environment
update channel_unlocks cu
set channel_slug = 'environment'
where cu.channel_slug = 'env'
  and not exists (
    select 1 from channel_unlocks c2
    where c2.worldcoin_nullifier = cu.worldcoin_nullifier
      and c2.channel_slug = 'environment'
);

delete from channel_unlocks cu
where cu.channel_slug = 'env';

-- crypto -> cryptography
update channel_unlocks cu
set channel_slug = 'cryptography'
where cu.channel_slug = 'crypto'
  and not exists (
    select 1 from channel_unlocks c2
    where c2.worldcoin_nullifier = cu.worldcoin_nullifier
      and c2.channel_slug = 'cryptography'
);

delete from channel_unlocks cu
where cu.channel_slug = 'crypto';

-- No-op mappings (tools -> tools, shelter -> shelter, education -> education) intentionally omitted.

commit;

