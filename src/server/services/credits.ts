import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase/server'

export type UserCreditsRow = {
  worldcoin_nullifier: string
  balance: number
  updated_at: string
  created_at: string
}

export async function getUserCredits(nullifier: string): Promise<UserCreditsRow> {
  try {
    const admin = getSupabaseAdmin()
    // Ensure row exists by calling ensure_user_credits, then fetch
    await admin.rpc('ensure_user_credits', { p_nullifier: nullifier })
    const { data, error } = await admin
      .from('user_credits')
      .select('*')
      .eq('worldcoin_nullifier', nullifier)
      .maybeSingle()
    if (error) throw error
    if (data) return data as UserCreditsRow

    // Fallback: ensure row exists via upsert, then select again
    const up = await admin
      .from('user_credits')
      .upsert({ worldcoin_nullifier: nullifier, balance: 0 }, { onConflict: 'worldcoin_nullifier' })
      .select('*')
      .maybeSingle()
    if (up.error) throw up.error
    const row = up.data as UserCreditsRow | null
    return (
      row ?? {
        worldcoin_nullifier: nullifier,
        balance: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    )
  } catch (err) {
    // Graceful fallback when migrations are not yet applied
    return {
      worldcoin_nullifier: nullifier,
      balance: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }
}

export async function addCredits(nullifier: string, amount: number, reason?: string): Promise<number> {
  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin.rpc('add_credits', {
      p_nullifier: nullifier,
      p_amount: amount,
      p_reason: reason ?? null,
    })
    if (error) throw error
    return data as number
  } catch {
    // If migrations not applied, return synthetic next balance (0 + amount)
    return amount
  }
}

export async function spendCredits(
  nullifier: string,
  amount: number,
  reason?: string,
  theme?: string
): Promise<{ ok: boolean; balance: number }> {
  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin.rpc('spend_credits', {
      p_nullifier: nullifier,
      p_amount: amount,
      p_reason: reason ?? null,
      p_theme: theme ?? null,
    })
    if (error) throw error
    const [row] = (data as { ok: boolean; balance: number }[]) || []
    return row || { ok: false, balance: 0 }
  } catch {
    // Graceful fallback (no spend if no DB)
    return { ok: false, balance: 0 }
  }
}
