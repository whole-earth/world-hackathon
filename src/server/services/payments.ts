import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase/server'
import type { PaymentRow, CreateInitiatedPaymentInput, UpdatePaymentPatch } from '@/types'

export async function createInitiatedPayment(input: CreateInitiatedPaymentInput): Promise<PaymentRow> {
  const admin = getSupabaseAdmin()

  // Create a compact reference ID (hex-ish, 32 chars)
  const reference = crypto.randomUUID().replace(/-/g, '')

  const to = input.to_address.toLowerCase()
  const desc = input.description ? String(input.description).slice(0, 280) : null

  const { data, error } = await admin
    .from('payments')
    .insert({
      reference,
      worldcoin_nullifier: input.worldcoin_nullifier,
      amount_usd: input.amount_usd,
      to_address: to,
      description: desc,
      status: 'initiated',
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }
  return data as PaymentRow
}

export async function findPaymentByReference(reference: string): Promise<PaymentRow | null> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('payments')
    .select('*')
    .eq('reference', reference)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as PaymentRow) || null
}

export async function updatePaymentByReference(reference: string, patch: UpdatePaymentPatch): Promise<PaymentRow> {
  const admin = getSupabaseAdmin()
  const { data, error } = await admin
    .from('payments')
    .update(patch)
    .eq('reference', reference)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as PaymentRow
}
