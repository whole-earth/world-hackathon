"use server"

import { headers } from 'next/headers'
import { assertRateLimit } from '@/server/lib/rate-limit'
import { ensureVerifiedNullifier } from '@/server/lib/world-verify'
import { isWorldcoinMockEnabled } from '@/server/config/worldcoin'
import { upsertProfileByNullifier } from '@/server/services'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getWorldNullifierFromCookie } from '@/server/lib/cookies'
import type { VerifyHumanAndUpsertInput, VerifyHumanAndUpsertResult } from '@/types'

// Verifies World ID proof-of-humanity (Orb level) and upserts a profile
// Usage: call on first-login with MiniKit verify payload and a username
export async function verifyHumanAndUpsertProfileAction(
  input: VerifyHumanAndUpsertInput
): Promise<VerifyHumanAndUpsertResult> {
  const { username, world_username } = input
  const finalUsername = (world_username || username)?.trim()
  if (!finalUsername) throw new Error('username or world_username is required')

  // Rate limit per IP
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
  assertRateLimit(`human-login:${ip}`, 10, 60_000) // 10/min per IP

  const isMock = isWorldcoinMockEnabled()

  // In production, require a payload so we can assert Orb-level PoH
  if (!isMock && !input.payload) {
    throw new Error('Missing payload for proof-of-humanity verification')
  }

  // Determine humanity based on verification_level
  const verification_level = (input.payload as any)?.verification_level as string | undefined
  const is_human = isMock ? true : verification_level?.toLowerCase() === 'orb'
  if (!is_human && !isMock) {
    throw new Error('Proof of humanity requires Orb verification')
  }

  // Ensure we have a verified nullifier (cookie, mock, or fresh proof)
  const { nullifier_hash } = await ensureVerifiedNullifier(input)

  // Upsert profile bound to this nullifier
  const profile = await upsertProfileByNullifier({
    worldcoin_nullifier: nullifier_hash,
    username: finalUsername,
    world_username: world_username || username || null,
  })

  return { ok: true, nullifier_hash, is_human: true, verification_level: verification_level ?? (isMock ? 'mock' : undefined), profile }
}

export type GetAuthStatusResult = {
  ok: true
  nullifier_hash: string | null
  is_human: boolean
}

// Returns current auth session (cookie) and whether a profile exists (proxy for humanity verification)
export async function getAuthStatusAction(): Promise<GetAuthStatusResult> {
  const nh = await getWorldNullifierFromCookie()
  if (!nh) return { ok: true, nullifier_hash: null, is_human: false }
  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('profiles')
      .select('worldcoin_nullifier')
      .eq('worldcoin_nullifier', nh)
      .maybeSingle()
    if (error) throw error
    return { ok: true, nullifier_hash: nh, is_human: !!data }
  } catch {
    // If the check fails, still report the session but unknown humanity → false
    return { ok: true, nullifier_hash: nh, is_human: false }
  }
}
