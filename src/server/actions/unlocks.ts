"use server"

import { headers } from 'next/headers'
import { assertRateLimit } from '@/server/lib/rate-limit'
import { ensureVerifiedNullifier } from '@/server/lib/world-verify'
import { findPaymentByReference } from '@/server/services/payments'
import { createChannelUnlockIfAbsent, getChannelUnlocksByNullifier } from '@/server/services/unlocks'
import { upsertProfileByNullifier } from '@/server/services'
import { getPaymentsServerConfig } from '@/server/config/payments'
import { isWorldcoinMockEnabled } from '@/server/config/worldcoin'
import type { UnlockChannelWithPaymentInput, UnlockChannelWithPaymentResult, GetUnlockedChannelsResult } from '@/types'

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 2 && slug.length <= 64
}

export async function unlockChannelWithPaymentAction(input: UnlockChannelWithPaymentInput): Promise<UnlockChannelWithPaymentResult> {
  const isMock = isWorldcoinMockEnabled()
  const { reference, channelSlug } = input || ({} as UnlockChannelWithPaymentInput)
  if (!channelSlug || !isValidSlug(channelSlug)) throw new Error('Invalid channelSlug')

  // Rate limit per IP
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
  assertRateLimit(`unlock:${channelSlug}:${ip}`, 30, 60_000)

  const { nullifier_hash } = await ensureVerifiedNullifier({})

  if (isMock) {
    const mockUsername = `mock-${nullifier_hash.slice(0, 8)}`
    try {
      await upsertProfileByNullifier({
        worldcoin_nullifier: nullifier_hash,
        username: mockUsername,
        world_username: null,
      })
    } catch {}
    const row = await createChannelUnlockIfAbsent({
      worldcoin_nullifier: nullifier_hash,
      channel_slug: channelSlug,
      unlocked_via: 'credits',
    })
    return { ok: true, unlocked: Boolean(row?.worldcoin_nullifier), channelSlug, method: 'credits' }
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

  const row = await createChannelUnlockIfAbsent({
    worldcoin_nullifier: nullifier_hash,
    channel_slug: channelSlug,
    unlocked_via: 'payment',
  })

  return { ok: true, unlocked: Boolean(row?.worldcoin_nullifier), channelSlug, method: 'payment' }
}

export async function getUnlockedChannelsAction(): Promise<GetUnlockedChannelsResult> {
  const { nullifier_hash } = await ensureVerifiedNullifier({})
  const rows = await getChannelUnlocksByNullifier(nullifier_hash)
  const channels = rows.map(r => r.channel_slug)
  return { ok: true, channels }
}
