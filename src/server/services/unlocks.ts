import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase/server'
import type { ThemeUnlockRow, CreateThemeUnlockInput } from '@/types'

export async function createThemeUnlockIfAbsent(input: CreateThemeUnlockInput): Promise<ThemeUnlockRow> {
  const admin = getSupabaseAdmin()
  const { worldcoin_nullifier, theme_slug } = input
  const method = input.method
  const payment_reference = input.payment_reference ?? null

  const { data, error } = await admin
    .from('theme_unlocks')
    .upsert(
      { worldcoin_nullifier, theme_slug, method, payment_reference },
      { onConflict: 'worldcoin_nullifier,theme_slug', ignoreDuplicates: false }
    )
    .select()
    .single()

  // Upsert will update method if an unlock already exists; that's acceptable (idempotent unlock)
  if (error) throw new Error(error.message)
  return data as ThemeUnlockRow
}

export async function getThemeUnlocksByNullifier(nullifier: string): Promise<ThemeUnlockRow[]> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('theme_unlocks')
    .select('*')
    .eq('worldcoin_nullifier', nullifier)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data as ThemeUnlockRow[]) || []
}

// Efficient existence check for a specific theme unlock
export async function isThemeUnlocked(nullifier: string, slug: string): Promise<boolean> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('theme_unlocks')
    .select('id', { head: true, count: 'exact' })
    .eq('worldcoin_nullifier', nullifier)
    .eq('theme_slug', slug)
  if (error) throw new Error(error.message)
  // When head: true, data is null; rely on count
  // Some clients may not return count unless requested; we requested exact
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyRes = data as any
  const count = typeof anyRes?.length === 'number' ? anyRes.length : (error as unknown as { count?: number })?.count
  // Fallback: when count not resolvable, try a maybeSingle select
  if (typeof count !== 'number') {
    const single = await admin
      .from('theme_unlocks')
      .select('id')
      .eq('worldcoin_nullifier', nullifier)
      .eq('theme_slug', slug)
      .limit(1)
      .maybeSingle()
    if (single.error) throw new Error(single.error.message)
    return Boolean(single.data)
  }
  return (count as number) > 0
}
