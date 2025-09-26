import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase/server'

export type ThemeUnlockRow = {
  id: string
  worldcoin_nullifier: string
  theme_slug: string
  method: 'payment' | 'credits' | 'mock'
  payment_reference: string | null
  created_at: string
}

export type CreateThemeUnlockInput = {
  worldcoin_nullifier: string
  theme_slug: string
  method: 'payment' | 'credits' | 'mock'
  payment_reference?: string | null
}

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

