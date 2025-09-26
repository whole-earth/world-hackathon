"use server"

import { headers } from 'next/headers'
import { assertRateLimit } from '@/server/lib/rate-limit'
import { ensureVerifiedNullifier } from '@/server/lib/world-verify'
import { getPaymentsServerConfig } from '@/server/config/payments'
import { createInitiatedPayment, findPaymentByReference, updatePaymentByReference } from '@/server/services/payments'
import type { MiniAppPaymentSuccessPayload } from '@worldcoin/minikit-js'
import { getDeveloperPortalTransaction } from '@/server/services/dev-portal'
import { ensureWorldcoinAppId, isWorldcoinMockEnabled } from '@/server/config/worldcoin'
import type { InitiateWorldPayInput, InitiateWorldPayResult, ConfirmWorldPayResult } from '@/types'

export async function initiateWorldPayAction(input: InitiateWorldPayInput): Promise<InitiateWorldPayResult> {
  const isMock = isWorldcoinMockEnabled()
  const { amountUsd, description } = input || {}
  if (typeof amountUsd !== 'number' || Number.isNaN(amountUsd)) {
    throw new Error('amountUsd must be a number')
  }
  if (amountUsd < 0.1) {
    throw new Error('Minimum amount is $0.10')
  }
  if (amountUsd > 10000) {
    throw new Error('Amount exceeds limit')
  }

  // Rate limit per IP
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
  assertRateLimit(`pay:init:${ip}`, 10, 60_000) // 10/min per IP

  // Ensure we associate payment with a verified human (even in mock)
  const { nullifier_hash } = await ensureVerifiedNullifier({})

  const { toAddress } = getPaymentsServerConfig()

  if (isMock) {
    // Do NOT write to DB in mock mode; return a synthetic reference
    const reference = crypto.randomUUID().replace(/-/g, '')
    return { ok: true, reference, to: toAddress, description: description?.trim() || undefined }
  }

  const payment = await createInitiatedPayment({
    worldcoin_nullifier: nullifier_hash,
    amount_usd: amountUsd,
    to_address: toAddress,
    description: description?.trim() || null,
  })

  return { ok: true, reference: payment.reference, to: payment.to_address, description: payment.description ?? undefined }
}

export async function confirmWorldPayAction(payload?: MiniAppPaymentSuccessPayload): Promise<ConfirmWorldPayResult> {
  const isMock = isWorldcoinMockEnabled()
  // Rate limit per IP
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
  assertRateLimit(`pay:confirm:${ip}`, 30, 60_000) // 30/min per IP (confirm can be polled)
  if (isMock) {
    // Auto-approve without DB side-effects
    await ensureVerifiedNullifier({})
    return { ok: true, success: true, status: 'mock-confirmed' }
  }
  if (!payload) throw new Error('Missing payload')
  if (payload.status !== 'success') throw new Error('Payment not successful')
  if (!payload.reference) throw new Error('Missing reference in payload')
  if (!payload.transaction_id) throw new Error('Missing transaction_id in payload')

  // Bind to verified user session
  const { nullifier_hash } = await ensureVerifiedNullifier({})

  // Load initiated payment and validate ownership + recipient
  const row = await findPaymentByReference(payload.reference)
  if (!row) throw new Error('Unknown payment reference')
  if (row.worldcoin_nullifier !== nullifier_hash) {
    throw new Error('Reference does not belong to current user')
  }

  const { toAddress } = getPaymentsServerConfig()
  if (row.to_address.toLowerCase() !== toAddress.toLowerCase()) {
    throw new Error('Recipient mismatch')
  }

  // Fetch canonical transaction status from Developer Portal
  const appId = ensureWorldcoinAppId()
  const tx = await getDeveloperPortalTransaction(payload.transaction_id, appId)

  // Basic integrity checks
  if (tx.reference && tx.reference !== row.reference) {
    throw new Error('Reference mismatch between payload and Developer Portal')
  }

  // Optionally, ensure recipient matches expectation from Developer Portal too
  if (tx.to && tx.to.toLowerCase() !== toAddress.toLowerCase()) {
    throw new Error('Recipient mismatch (Developer Portal)')
  }

  const failed = tx.status === 'failed'
  const allowed = new Set(['initiated','submitted','mined','confirmed','failed','cancelled'])
  const statusRaw = tx.status || 'confirmed'
  const status = allowed.has(statusRaw) ? statusRaw : (failed ? 'failed' : 'confirmed')

  await updatePaymentByReference(row.reference, {
    status,
    transaction_id: payload.transaction_id,
    token_symbol: tx.token ?? null,
    token_amount_wei: tx.token_amount ?? null,
  })

  return { ok: true, success: !failed, status }
}
