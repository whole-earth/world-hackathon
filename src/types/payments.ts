// Shared payment action types (client/server)

export type InitiateWorldPayInput = {
  amountUsd: number
  description?: string
}

export type InitiateWorldPayResult = {
  ok: true
  reference: string
  to: string
  description?: string
}

export type ConfirmWorldPayResult = {
  ok: true
  success: boolean
  status: string
}

// DB row shape
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

export type UpdatePaymentPatch = Partial<
  Pick<PaymentRow, 'status' | 'transaction_id' | 'token_symbol' | 'token_amount_wei'>
>
