"use server"

import { headers } from 'next/headers'
import { assertRateLimit } from '@/server/lib/rate-limit'
import { ensureVerifiedNullifier } from '@/server/lib/world-verify'
import { isWorldcoinMockEnabled } from '@/server/config/worldcoin'
import { upsertProfileByNullifier } from '@/server/services'
import { createChannelUnlockIfAbsent } from '@/server/services/unlocks'
import { mapThemeToChannel } from '@/constants/themeChannelMap'
import { getUserCredits, spendCredits } from '@/server/services/credits'
import type {
  GetCreditsResult,
  SpendCreditsAndUnlockInput,
  SpendCreditsAndUnlockResult,
  AddSwipeCreditInput,
  AddSwipeCreditResult,
} from '@/types'

export async function getCreditsAction(): Promise<GetCreditsResult> {
  try {
    const { nullifier_hash } = await ensureVerifiedNullifier({})
    const row = await getUserCredits(nullifier_hash)
    return { ok: true, balance: row.credits }
  } catch {
    return { ok: true, balance: 0 }
  }
}

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 2 && slug.length <= 64
}

export async function spendCreditsAndUnlockAction(input: SpendCreditsAndUnlockInput): Promise<SpendCreditsAndUnlockResult> {
  const { themeSlug } = input || ({} as SpendCreditsAndUnlockInput)
  const cost = typeof input?.cost === 'number' ? input.cost : 20
  if (!themeSlug || !isValidSlug(themeSlug)) throw new Error('Invalid themeSlug')
  if (cost <= 0 || cost > 1000) throw new Error('Invalid cost')

  // Rate limit per IP and theme
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
  assertRateLimit(`credits:unlock:${themeSlug}:${ip}`, 60, 60_000)

  const { nullifier_hash } = await ensureVerifiedNullifier({})

  if (isWorldcoinMockEnabled()) {
    const mockUsername = `mock-${nullifier_hash.slice(0, 8)}`
    try {
      await upsertProfileByNullifier({
        worldcoin_nullifier: nullifier_hash,
        username: mockUsername,
        world_username: null,
      })
    } catch {}
  }

  const res = await spendCredits(nullifier_hash, cost, 'unlock', themeSlug)
  if (!res.ok) {
    throw new Error('Not enough credits')
  }

  const channelSlug = mapThemeToChannel(themeSlug)
  await createChannelUnlockIfAbsent({
    worldcoin_nullifier: nullifier_hash,
    channel_slug: channelSlug,
    unlocked_via: 'credits',
  })

  return { ok: true, unlocked: true, balance: res.balance, themeSlug }
}

// Adds swipe credits for the verified user. Default +1.
export async function addSwipeCreditAction(input?: AddSwipeCreditInput): Promise<AddSwipeCreditResult> {
  const amount = typeof input?.amount === 'number' ? input!.amount : 1
  const reason = input?.reason ?? 'swipe'
  if (amount <= 0 || amount > 10) throw new Error('Invalid credit amount')

  // Rate limit per IP
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
  assertRateLimit(`credits:add:${ip}`, 120, 60_000) // up to 120/min per IP

  const { nullifier_hash } = await ensureVerifiedNullifier({})
  const next = await (await import('@/server/services/credits')).addCredits(nullifier_hash, amount, reason)
  return { ok: true, balance: next }
}

// Sync client credit mutations to server
export async function syncCreditsAction(input: { amount: number; reason?: string }): Promise<AddSwipeCreditResult> {
  const { amount, reason = 'client-sync' } = input
  console.log('syncCreditsAction: Called with', { amount, reason })
  
  if (amount <= 0 || amount > 100) throw new Error('Invalid credit amount')

  // Rate limit per IP
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
  assertRateLimit(`credits:sync:${ip}`, 10, 60_000) // up to 10/min per IP

  const { nullifier_hash } = await ensureVerifiedNullifier({})
  
  // Use the existing addCredits service
  const { addCredits } = await import('@/server/services/credits')
  const next = await addCredits(nullifier_hash, amount, reason)
  return { ok: true, balance: next }
}
