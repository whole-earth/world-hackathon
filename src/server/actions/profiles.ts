"use server"

import { upsertProfileByNullifier } from '@/server/services'
import { headers } from 'next/headers'
import { assertRateLimit } from '@/server/lib/rate-limit'
import type { ISuccessResult } from '@worldcoin/minikit-js'
import { ensureVerifiedNullifier } from '@/server/lib/world-verify'

export type VerifyAndUpsertInput = {
  payload?: ISuccessResult
  nullifier_hash?: string
  action?: string
  signal?: string
  username?: string
  world_username?: string
}

export async function verifyAndUpsertProfileAction(input: VerifyAndUpsertInput) {
  const { username, world_username } = input
  const finalUsername = (world_username || username)?.trim()
  if (!finalUsername) throw new Error('username or world_username is required')

  // Rate limit per IP
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
  assertRateLimit(`register:${ip}`, 10, 60_000) // 10/min per IP

  // Ensure we have a verified nullifier (cookie, mock, or fresh proof)
  const { nullifier_hash } = await ensureVerifiedNullifier(input)
  const profile = await upsertProfileByNullifier({
    worldcoin_nullifier: nullifier_hash,
    username: finalUsername,
    world_username: world_username || username || null,
  })

  return { ok: true, profile, nullifier_hash }
}
