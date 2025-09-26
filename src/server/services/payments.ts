import 'server-only'

import { getSupabaseAdmin } from '@/lib/supabase/server'

export type PaymentRow = {
  id: string
  reference: string
  worldcoin_nullifier: string
  amount_usd: number
  to_address: string
  description: string | null
  status: string
  transaction_id: string | null
  token_symbol: string | null
  token_amount_wei: string | null
  created_at: string
  updated_at: string
}

export type CreateInitiatedPaymentInput = {
  worldcoin_nullifier: string
  amount_usd: number
  to_address: string
  description: string | null
}

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

export type UpdatePaymentPatch = Partial<
  Pick<PaymentRow, 'status' | 'transaction_id' | 'token_symbol' | 'token_amount_wei'>
>

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
