"use server"

import { headers } from 'next/headers'
import { assertRateLimit } from '@/server/lib/rate-limit'
import { ensureVerifiedNullifier } from '@/server/lib/world-verify'
import { findPaymentByReference } from '@/server/services/payments'
import { createThemeUnlockIfAbsent, getThemeUnlocksByNullifier } from '@/server/services/unlocks'
import { getPaymentsServerConfig } from '@/server/config/payments'

export type UnlockThemeWithPaymentInput = {
  reference: string
  themeSlug: string
}

export type UnlockThemeWithPaymentResult = {
  ok: true
  unlocked: boolean
  themeSlug: string
  method: 'payment' | 'mock'
}

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 2 && slug.length <= 64
}

export async function unlockThemeWithPaymentAction(input: UnlockThemeWithPaymentInput): Promise<UnlockThemeWithPaymentResult> {
  const isMock = String(process.env.WORLDCOIN_VERIFY_MOCK || '').toLowerCase() === 'true'
  const { reference, themeSlug } = input || ({} as UnlockThemeWithPaymentInput)
  if (!themeSlug || !isValidSlug(themeSlug)) throw new Error('Invalid themeSlug')

  // Rate limit per IP
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
  assertRateLimit(`unlock:${themeSlug}:${ip}`, 30, 60_000)

  const { nullifier_hash } = await ensureVerifiedNullifier({})

  if (isMock) {
    const row = await createThemeUnlockIfAbsent({
      worldcoin_nullifier: nullifier_hash,
      theme_slug: themeSlug,
      method: 'mock',
      payment_reference: null,
    })
    return { ok: true, unlocked: Boolean(row?.id), themeSlug, method: 'mock' }
  }

  if (!reference || reference.length < 16) throw new Error('Invalid reference')
  const payment = await findPaymentByReference(reference)
  if (!payment) throw new Error('Payment reference not found')
  if (payment.worldcoin_nullifier !== nullifier_hash) throw new Error('Payment does not belong to current user')

  const { toAddress } = getPaymentsServerConfig()
  if (payment.to_address.toLowerCase() !== toAddress.toLowerCase()) {
    throw new Error('Recipient mismatch')
  }

  // Consider payment valid if not failed and has a transaction id
  if (!payment.transaction_id) throw new Error('Payment not yet submitted')
  if (payment.status === 'failed') throw new Error('Payment failed')

  const row = await createThemeUnlockIfAbsent({
    worldcoin_nullifier: nullifier_hash,
    theme_slug: themeSlug,
    method: 'payment',
    payment_reference: reference,
  })

  return { ok: true, unlocked: Boolean(row?.id), themeSlug, method: 'payment' }
}

export type GetUnlockedThemesResult = { ok: true; themes: string[] }

export async function getUnlockedThemesAction(): Promise<GetUnlockedThemesResult> {
  const { nullifier_hash } = await ensureVerifiedNullifier({})
  const rows = await getThemeUnlocksByNullifier(nullifier_hash)
  const themes = rows.map(r => r.theme_slug)
  return { ok: true, themes }
}

