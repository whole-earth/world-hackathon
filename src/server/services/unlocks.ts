import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase/server'
import type { ChannelUnlockRow, CreateChannelUnlockInput } from '@/types'
import { legacyThemeSlugForChannel } from '@/constants/themeChannelMap'

export async function createChannelUnlockIfAbsent(input: CreateChannelUnlockInput): Promise<ChannelUnlockRow> {
  const admin = getSupabaseAdmin()
  const { worldcoin_nullifier, channel_slug, unlocked_via } = input

  const { data, error } = await admin
    .from('channel_unlocks')
    .upsert(
      { worldcoin_nullifier, channel_slug, unlocked_via },
      { onConflict: 'worldcoin_nullifier,channel_slug', ignoreDuplicates: false }
    )
    .select()
    .single()

  // Upsert will update unlocked_via if an unlock already exists; that's acceptable (idempotent unlock)
  if (error) throw new Error(error.message)
  return data as ChannelUnlockRow
}

export async function getChannelUnlocksByNullifier(nullifier: string): Promise<ChannelUnlockRow[]> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('channel_unlocks')
    .select('*')
    .eq('worldcoin_nullifier', nullifier)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data as ChannelUnlockRow[]) || []
}

// Efficient existence check for a specific channel unlock
export async function isChannelUnlocked(nullifier: string, slug: string): Promise<boolean> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('channel_unlocks')
    .select('worldcoin_nullifier', { head: true, count: 'exact' })
    .eq('worldcoin_nullifier', nullifier)
    .eq('channel_slug', slug)
  if (error) throw new Error(error.message)
  // When head: true, data is null; rely on count
  // Some clients may not return count unless requested; we requested exact
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyRes = data as any
  const count = typeof anyRes?.length === 'number' ? anyRes.length : (error as unknown as { count?: number })?.count
  // Fallback: when count not resolvable, try a maybeSingle select
  if (typeof count !== 'number') {
    const single = await admin
      .from('channel_unlocks')
      .select('worldcoin_nullifier')
      .eq('worldcoin_nullifier', nullifier)
      .eq('channel_slug', slug)
      .limit(1)
      .maybeSingle()
    if (single.error) throw new Error(single.error.message)
    if (single.data) return true
    // Fallback: check legacy theme slug alias (e.g., 'crypto')
    const legacy = legacyThemeSlugForChannel(slug)
    if (legacy) {
      const singleLegacy = await admin
        .from('channel_unlocks')
        .select('worldcoin_nullifier')
        .eq('worldcoin_nullifier', nullifier)
        .eq('channel_slug', legacy)
        .limit(1)
        .maybeSingle()
      if (singleLegacy.error) throw new Error(singleLegacy.error.message)
      return Boolean(singleLegacy.data)
    }
    return false
  }
  if ((count as number) > 0) return true
  // Fallback alias check when count is zero
  const legacy = legacyThemeSlugForChannel(slug)
  if (!legacy) return false
  const singleLegacy = await admin
    .from('channel_unlocks')
    .select('worldcoin_nullifier')
    .eq('worldcoin_nullifier', nullifier)
    .eq('channel_slug', legacy)
    .limit(1)
    .maybeSingle()
  if (singleLegacy.error) throw new Error(singleLegacy.error.message)
  return Boolean(singleLegacy.data)
}
